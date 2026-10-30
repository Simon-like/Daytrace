import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { gunzipSync, gzipSync } from "node:zlib";
import http from "node:http";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const apiOrigin = "http://127.0.0.1:4101";
const siteOrigin = "http://127.0.0.1:4100";
const canary = "PRIVATE_CANARY_DO_NOT_PUBLISH_9D42";
const privateTitle = "PRIVATE_CANARY_TITLE_51B8";
const server = path.join(root, "apps/site/.next/standalone/apps/site/server.js");
const standaloneManifest = path.join(root, "evidence/standalone-manifest.json");
const children = [];
const logs = [];

function launch(command, args, options, name) {
  const child = spawn(command, args, options);
  children.push(child);
  for (const stream of [child.stdout, child.stderr]) {
    stream.on("data", (chunk) => {
      const text = `${name}: ${chunk.toString()}`;
      logs.push(text);
      if (logs.length > 100) logs.shift();
    });
  }
  return child;
}

async function waitFor(url) {
  let lastError;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Service did not become ready: ${url}; ${lastError ?? "not ready"}\n${logs.join("")}`);
}

async function stopChildren() {
  await Promise.all(children.map((child) => new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) return resolve();
    child.once("exit", resolve);
    child.kill("SIGTERM");
    setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    }, 2000).unref();
  })));
}

async function text(url) {
  const response = await fetch(url);
  return { response, body: await response.text() };
}

function compressedRequest(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, { headers: { "accept-encoding": "gzip" } }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        const body = Buffer.concat(chunks);
        const encoding = response.headers["content-encoding"] ?? "identity";
        const plain = encoding === "gzip" ? gunzipSync(body) : body;
        resolve({
          url,
          transferBytes: body.length,
          gzipBytes: gzipSync(plain).length,
          encoding,
          status: response.statusCode,
        });
      });
    });
    request.on("error", reject);
  });
}

async function filesBelow(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === "cache") continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await filesBelow(target));
    else if (entry.isFile()) output.push(target);
  }
  return output;
}

async function scanForPrivateBytes(directory) {
  let scannedFiles = 0;
  for (const file of await filesBelow(directory)) {
    const body = await readFile(file);
    scannedFiles += 1;
    assert.equal(body.includes(canary), false, `Private canary found in ${file}`);
    assert.equal(body.includes(privateTitle), false, `Private title found in ${file}`);
  }
  return scannedFiles;
}

let evidence;
try {
  await stat(server);
  const manifest = JSON.parse(await readFile(standaloneManifest, "utf8"));
  await stat(path.join(root, manifest.tracedSharedContract));
  assert.equal(manifest.sharedContractTraceForm, "bundled-server-chunk");
  launch(process.execPath, [path.join(root, "apps/api/dist/main.js")], {
    cwd: root,
    env: { ...process.env, CONTENT_ROOT: path.join(root, "content"), PORT: "4101", NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  }, "api");
  launch(process.execPath, [server], {
    cwd: path.dirname(server),
    env: { ...process.env, API_INTERNAL_ORIGIN: apiOrigin, HOSTNAME: "127.0.0.1", PORT: "4100", NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  }, "site");

  await waitFor(`${apiOrigin}/api/v1/health/ready`);
  await waitFor(`${siteOrigin}/`);

  const publicApi = await text(`${apiOrigin}/api/v1/records/public-arch-sample`);
  assert.equal(publicApi.response.status, 200);
  const article = JSON.parse(publicApi.body);
  assert.equal(article.contractVersion, "1.0.0-arch.1");
  assert.ok(article.html.includes("PUBLIC_SSR_PARAGRAPH_7F3A"));

  const ssr = await text(`${siteOrigin}/records/public-arch-sample`);
  assert.equal(ssr.response.status, 200);
  assert.ok(ssr.body.includes("PUBLIC_SSR_PARAGRAPH_7F3A"));
  assert.ok(ssr.body.includes("<h2>从 Markdown 到完整 HTML</h2>"));
  assert.ok(!ssr.body.includes(canary));
  assert.ok(!ssr.body.includes(privateTitle));

  const privateApi = await text(`${apiOrigin}/api/v1/records/private-arch-canary`);
  const missingApi = await text(`${apiOrigin}/api/v1/records/not-present-arch-sample`);
  assert.equal(privateApi.response.status, 404);
  assert.equal(missingApi.response.status, 404);
  assert.equal(JSON.parse(privateApi.body).error.code, "RECORD_NOT_FOUND");
  assert.equal(JSON.parse(privateApi.body).error.message, JSON.parse(missingApi.body).error.message);
  assert.ok(!privateApi.body.includes(canary));
  assert.ok(!privateApi.body.includes(privateTitle));
  assert.ok(privateApi.response.headers.get("x-request-id"));

  const privateSsr = await text(`${siteOrigin}/records/private-arch-canary`);
  assert.equal(privateSsr.response.status, 404);
  assert.ok(!privateSsr.body.includes(canary));
  assert.ok(!privateSsr.body.includes(privateTitle));

  const invalid = await text(`${apiOrigin}/api/v1/records/invalid-arch-sample`);
  const invalidBody = JSON.parse(invalid.body);
  assert.equal(invalid.response.status, 422);
  assert.equal(invalidBody.error.code, "CONTENT_INVALID");
  assert.equal(invalidBody.error.issues[0].file, "content/public/invalid-arch-sample.md");
  assert.equal(invalidBody.error.issues[0].field, "date");
  assert.ok(invalidBody.error.requestId);
  assert.equal(Object.hasOwn(invalidBody.error, "stack"), false);

  const scannedClientFiles = await scanForPrivateBytes(path.join(root, "apps/site/.next/static"));
  const scannedStandaloneFiles = await scanForPrivateBytes(path.join(root, "apps/site/.next/standalone"));

  const htmlTransfer = await compressedRequest(`${siteOrigin}/records/public-arch-sample`);
  const scriptSources = [...ssr.body.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => match[1]);
  const styleSources = [...ssr.body.matchAll(/<link[^>]+>/g)]
    .filter((match) => match[0].includes('rel="stylesheet"'))
    .map((match) => match[0].match(/href="([^"]+)"/)?.[1])
    .filter(Boolean);
  const unique = (items) => [...new Set(items)].map((item) => item.replaceAll("&amp;", "&"));
  const scripts = await Promise.all(unique(scriptSources).map((source) => compressedRequest(new URL(source, siteOrigin).href)));
  const styles = await Promise.all(unique(styleSources).map((source) => compressedRequest(new URL(source, siteOrigin).href)));
  const jsGzipBytes = scripts.reduce((sum, item) => sum + item.gzipBytes, 0);
  const firstScreenTransferBytes = [htmlTransfer, ...scripts, ...styles].reduce((sum, item) => sum + item.transferBytes, 0);
  const budget = {
    methodology: "Production standalone HTTP responses; gzip sizes from actual response bodies; transfer bytes counted on the wire with Accept-Encoding: gzip. System fonts and no article images, so both contribute zero requests/bytes in this baseline.",
    html: htmlTransfer,
    scripts,
    styles,
    fontRequestCount: 0,
    imageRequestCount: 0,
    necessaryJsGzipBytes: jsGzipBytes,
    necessaryJsGzipKiB: Number((jsGzipBytes / 1024).toFixed(2)),
    necessaryJsBudgetKiB: 80,
    necessaryJsDeltaKiB: Number((jsGzipBytes / 1024 - 80).toFixed(2)),
    necessaryJsWithinBudget: jsGzipBytes <= 80 * 1024,
    firstScreenTransferBytes,
    firstScreenTransferKiB: Number((firstScreenTransferBytes / 1024).toFixed(2)),
    firstScreenBudgetKiB: 800,
    firstScreenDeltaKiB: Number((firstScreenTransferBytes / 1024 - 800).toFixed(2)),
    firstScreenWithinBudget: firstScreenTransferBytes <= 800 * 1024,
  };

  evidence = {
    generatedAt: new Date().toISOString(),
    environment: { node: process.version, platform: process.platform, arch: process.arch, mode: "host production standalone" },
    checks: {
      publicMarkdownToNestApi: "pass",
      nextSsrCompleteHtml: "pass",
      sharedRuntimeContract: "pass",
      standaloneSharedPackageTrace: "pass",
      privateApiAndSsrNegativeIsolation: "pass",
      indistinguishablePrivateAndMissingErrors: "pass",
      validationErrorFileFieldAndRequestId: "pass",
      publicArtifactPrivateCanaryScan: "pass",
    },
    scannedClientFiles,
    scannedStandaloneFiles,
    budget,
    container: { status: "not-run-by-this-script" },
  };
  await mkdir(path.join(root, "evidence"), { recursive: true });
  await writeFile(path.join(root, "evidence/integration.json"), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ checks: evidence.checks, budget }, null, 2));
} catch (error) {
  console.error(error);
  console.error(logs.join(""));
  process.exitCode = 1;
} finally {
  await stopChildren();
}
