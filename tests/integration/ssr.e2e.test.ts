import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const recordId = "rec_7d0c0f2d-8f5b-4f0e-a3a6-111111111111";
const privateId = "rec_7d0c0f2d-8f5b-4f0e-a3a6-555555555555";
const draftId = "rec_7d0c0f2d-8f5b-4f0e-a3a6-777777777777";
const privateAssetId = "ast_7d0c0f2d-8f5b-4f0e-a3a6-555555555555";

interface RunningProcess {
  readonly child: ChildProcess;
  output: string;
}

function launch(command: string, args: readonly string[], env: NodeJS.ProcessEnv): RunningProcess {
  const child = spawn(command, args, {
    cwd: root,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", ...env },
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
  });
  const running: RunningProcess = { child, output: "" };
  const capture = (chunk: Buffer): void => {
    running.output = `${running.output}${chunk.toString()}`.slice(-40_000);
  };
  child.stdout?.on("data", capture);
  child.stderr?.on("data", capture);
  return running;
}

function signal(running: RunningProcess, signal: NodeJS.Signals): void {
  const { child } = running;
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform !== "win32" && child.pid !== undefined) {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch {
      // The process may have exited between the state check and signal.
    }
  }
  child.kill(signal);
}

async function stop(running: RunningProcess | undefined): Promise<void> {
  if (running === undefined || running.child.exitCode !== null || running.child.signalCode !== null) return;
  const exited = once(running.child, "exit");
  signal(running, "SIGTERM");
  let timer: NodeJS.Timeout | undefined;
  await Promise.race([
    exited,
    new Promise<void>((resolveWait) => {
      timer = setTimeout(resolveWait, 3_000);
    }),
  ]);
  if (timer !== undefined) clearTimeout(timer);
  if (running.child.exitCode === null && running.child.signalCode === null) {
    signal(running, "SIGKILL");
    await exited;
  }
}

async function unusedPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const { port } = address;
  await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  return port;
}

async function waitUntilReady(url: string, running: RunningProcess): Promise<void> {
  const deadline = Date.now() + 20_000;
  let lastError = "not attempted";
  while (Date.now() < deadline) {
    if (running.child.exitCode !== null || running.child.signalCode !== null) {
      throw new Error(`Service exited before readiness.\n${running.output}`);
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(750) });
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(`Service was not ready: ${lastError}\n${running.output}`);
}

test("built Nest and Next services render only the public snapshot at request time", async () => {
  const apiPort = await unusedPort();
  let sitePort = await unusedPort();
  while (sitePort === apiPort) sitePort = await unusedPort();
  const apiOrigin = `http://127.0.0.1:${apiPort}`;
  const siteOrigin = `http://127.0.0.1:${sitePort}`;
  let api: RunningProcess | undefined;
  let site: RunningProcess | undefined;
  try {
    api = launch(process.execPath, ["apps/api/dist/main.js"], {
      API_HOST: "127.0.0.1",
      API_PORT: String(apiPort),
      CONTENT_ROOT: resolve(root, "apps/api/fixtures/content"),
    });
    await waitUntilReady(`${apiOrigin}/api/v1/health/ready`, api);
    site = launch(process.execPath, [
      "apps/site/node_modules/next/dist/bin/next",
      "start",
      "apps/site",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(sitePort),
    ], { API_INTERNAL_ORIGIN: apiOrigin });
    await waitUntilReady(`${siteOrigin}/`, site);

    const homeResponse = await fetch(`${siteOrigin}/`);
    const homeHtml = await homeResponse.text();
    assert.equal(homeResponse.status, 200, homeHtml);
    assert.ok(homeHtml.includes("合成样本：一次可验证的发布检查"));
    assert.ok(homeHtml.includes(`/records/${recordId}/`));
    assert.ok(!homeHtml.includes("PRIVATE_"));
    assert.ok(!homeHtml.includes("DRAFT_"));

    const detailResponse = await fetch(`${siteOrigin}/records/${recordId}/`);
    const detailHtml = await detailResponse.text();
    assert.equal(detailResponse.status, 200, detailHtml);
    assert.ok(detailHtml.includes("PUBLIC_SSR_PARAGRAPH_7F3A"));
    assert.ok(detailHtml.includes("本文目录"));
    assert.ok(detailHtml.includes('href="#dt-从问题开始"'));
    assert.ok(detailHtml.includes("/api/v1/assets/ast_7d0c0f2d-8f5b-4f0e-a3a6-444444444444"));
    assert.ok(detailHtml.includes("/api/v1/assets/ast_7d0c0f2d-8f5b-4f0e-a3a6-666666666666"));
    assert.ok(!detailHtml.includes("PRIVATE_"));
    assert.ok(!detailHtml.includes("DRAFT_"));

    for (const [id, canary] of [[privateId, "PRIVATE_"], [draftId, "DRAFT_"]] as const) {
      const response = await fetch(`${siteOrigin}/records/${id}/`);
      const html = await response.text();
      assert.equal(response.status, 404, html);
      assert.ok(html.includes("这条记录不存在，或当前不可见"));
      assert.ok(!html.includes(canary));
    }
    const privateAsset = await fetch(`${apiOrigin}/api/v1/assets/${privateAssetId}`);
    const privateAssetBody = await privateAsset.text();
    assert.equal(privateAsset.status, 404, privateAssetBody);
    assert.ok(!privateAssetBody.includes("PRIVATE_"));

    const oldSlug = await fetch(`${siteOrigin}/records/release-check-v0`, { redirect: "manual" });
    await oldSlug.body?.cancel();
    assert.equal(oldSlug.status, 308);
    assert.equal(oldSlug.headers.get("location"), `/records/${recordId}/`);

    await stop(api);
    api = undefined;
    const failureResponse = await fetch(`${siteOrigin}/`);
    const failureHtml = await failureResponse.text();
    assert.equal(failureResponse.status, 200, failureHtml);
    assert.ok(failureHtml.includes("暂时无法读取公开记录"), failureHtml);
    assert.ok(!failureHtml.includes("0 篇公开记录"));
  } catch (error) {
    assert.fail(`${error instanceof Error ? error.stack : String(error)}\nAPI output:\n${api?.output ?? "stopped"}\nSite output:\n${site?.output ?? "not started"}`);
  } finally {
    await stop(site);
    await stop(api);
  }
});
