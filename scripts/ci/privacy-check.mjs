import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const privateId = "rec_7d0c0f2d-8f5b-4f0e-a3a6-555555555555";
const draftId = "rec_7d0c0f2d-8f5b-4f0e-a3a6-777777777777";
const publicId = "rec_7d0c0f2d-8f5b-4f0e-a3a6-111111111111";
const privateAssetId = "ast_7d0c0f2d-8f5b-4f0e-a3a6-555555555555";
const canaries = ["PRIVATE_TITLE_CANARY_5B11", "PRIVATE_SUMMARY_CANARY_5B11", "PRIVATE_BODY_CANARY_5B11", "PRIVATE_ATTACHMENT_CANARY_5B11", "DRAFT_TITLE_CANARY_77A1", "DRAFT_SUMMARY_CANARY_77A1", "DRAFT_BODY_CANARY_77A1"];

function assertNoCanary(value, source) {
  for (const canary of canaries) assert.ok(!value.includes(canary), `${canary} leaked into ${source}`);
}

function launch(command, args, env, cwd = root) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", ...env },
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
  });
  const running = { child, output: "" };
  const capture = (chunk) => {
    running.output = `${running.output}${chunk.toString()}`.slice(-40_000);
  };
  child.stdout.on("data", capture);
  child.stderr.on("data", capture);
  return running;
}

function signal(running, name) {
  if (running.child.exitCode !== null || running.child.signalCode !== null) return;
  if (process.platform !== "win32" && running.child.pid !== undefined) {
    try {
      process.kill(-running.child.pid, name);
      return;
    } catch {
      // The process exited between the status check and signal.
    }
  }
  running.child.kill(name);
}

async function stop(running) {
  if (!running || running.child.exitCode !== null || running.child.signalCode !== null) return;
  const exited = once(running.child, "exit");
  signal(running, "SIGTERM");
  const timer = setTimeout(() => signal(running, "SIGKILL"), 3_000);
  await exited;
  clearTimeout(timer);
}

async function unusedPort() {
  const server = createServer();
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const { port } = address;
  await new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  return port;
}

async function ready(url, running) {
  const deadline = Date.now() + 20_000;
  let lastError = "not attempted";
  while (Date.now() < deadline) {
    if (running.child.exitCode !== null || running.child.signalCode !== null) {
      throw new Error(`Service exited before readiness: ${running.output}`);
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

async function filesBelow(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(target));
    else if (entry.isFile()) files.push(target);
  }
  return files;
}

const report = {
  schemaVersion: "daytrace.privacy-ci/v1",
  publicArtifactFiles: 0,
  responses: [],
  canaryCount: canaries.length,
};
let api;
let site;
try {
  const artifactRoots = [
    path.join(root, "apps/site/.next/static"),
    path.join(root, "apps/site/public"),
    path.join(root, "apps/site/.next/standalone"),
  ];
  for (const directory of artifactRoots) {
    for (const file of await filesBelow(directory)) {
      assertNoCanary(await readFile(file, "utf8"), path.relative(root, file));
      report.publicArtifactFiles += 1;
    }
  }

  const apiPort = await unusedPort();
  let sitePort = await unusedPort();
  while (sitePort === apiPort) sitePort = await unusedPort();
  const apiOrigin = `http://127.0.0.1:${apiPort}`;
  const siteOrigin = `http://127.0.0.1:${sitePort}`;
  api = launch(process.execPath, ["apps/api/dist/main.js"], {
    API_HOST: "127.0.0.1",
    API_PORT: String(apiPort),
    CONTENT_ROOT: path.join(root, "apps/api/fixtures/content"),
  });
  await ready(`${apiOrigin}/api/v1/health/ready`, api);
  const isolatedApp = path.join(root, "apps/site/.next/standalone/apps/site");
  site = launch(process.execPath, ["server.js"], {
    HOSTNAME: "127.0.0.1",
    PORT: String(sitePort),
    API_INTERNAL_ORIGIN: apiOrigin,
  }, isolatedApp);
  await ready(`${siteOrigin}/`, site);

  const cases = [
    ["public home HTML", `${siteOrigin}/`, 200, {}, "合成样本：一次可验证的发布检查"],
    ["public detail HTML", `${siteOrigin}/records/${publicId}/`, 200, {}, "PUBLIC_SSR_PARAGRAPH_7F3A"],
    ["public detail RSC", `${siteOrigin}/records/${publicId}/`, 200, { RSC: "1" }, "PUBLIC_SSR_PARAGRAPH_7F3A"],
    ["private detail HTML", `${siteOrigin}/records/${privateId}/`, 404, {}, null],
    ["private detail RSC", `${siteOrigin}/records/${privateId}/`, 200, { RSC: "1" }, "NEXT_HTTP_ERROR_FALLBACK;404"],
    ["draft detail HTML", `${siteOrigin}/records/${draftId}/`, 404, {}, null],
    ["public API list", `${apiOrigin}/api/v1/records`, 200, {}, "合成样本：一次可验证的发布检查"],
    ["private API detail", `${apiOrigin}/api/v1/records/${privateId}`, 404, {}, null],
    ["private API asset", `${apiOrigin}/api/v1/assets/${privateAssetId}`, 404, {}, null],
    ["anonymous owner query", `${apiOrigin}/api/v1/records?scope=owner`, 401, {}, "AUTH_REQUIRED"],
  ];
  for (const [name, url, expectedStatus, headers, requiredText] of cases) {
    const response = await fetch(url, { headers, redirect: "follow" });
    const body = await response.text();
    assert.equal(response.status, expectedStatus, `${name}: ${body}`);
    if (requiredText !== null) assert.ok(body.includes(requiredText), `${name} lacked expected content`);
    assertNoCanary(body, name);
    report.responses.push({ name, status: response.status, bytes: Buffer.byteLength(body) });
  }
  assertNoCanary(api.output, "API logs");
  assertNoCanary(site.output, "Next logs");
  const output = path.join(root, "tests/cicd/.artifacts/privacy-report.json");
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o644 });
  console.log(`Privacy checks passed: ${report.publicArtifactFiles} artifact files, ${report.responses.length} responses.`);
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error));
  console.error(`API output:\n${api?.output ?? "not started"}`);
  console.error(`Site output:\n${site?.output ?? "not started"}`);
  process.exitCode = 1;
} finally {
  await stop(site);
  await stop(api);
}
