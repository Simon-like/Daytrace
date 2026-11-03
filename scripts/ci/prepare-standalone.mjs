import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const build = path.join(root, "apps/site/.next");
const standalone = path.join(build, "standalone");
const isolatedApp = path.join(standalone, "apps/site");
const server = path.join(isolatedApp, "server.js");

async function filesBelow(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(target));
    else if (entry.isFile()) files.push(target);
  }
  return files;
}

async function digest(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

await stat(server);
const serverFiles = (await filesBelow(path.join(isolatedApp, ".next/server")))
  .filter((file) => file.endsWith(".js"));
let tracedContract = null;
let tracedConfig = null;
for (const file of serverFiles) {
  const body = await readFile(file, "utf8");
  if (tracedContract === null && body.includes("daytrace-markdown-2") && body.includes("AUTH_REQUIRED")) {
    tracedContract = file;
  }
  if (tracedConfig === null && body.includes("API_INTERNAL_ORIGIN")) tracedConfig = file;
}
assert.ok(tracedContract, "Shared contracts were not traced into the standalone server");
assert.ok(tracedConfig, "Shared runtime config was not traced into the standalone server");

await mkdir(path.join(isolatedApp, ".next"), { recursive: true });
await cp(path.join(build, "static"), path.join(isolatedApp, ".next/static"), {
  recursive: true,
  force: true,
});
await cp(path.join(root, "apps/site/public"), path.join(isolatedApp, "public"), {
  recursive: true,
  force: true,
});

const staticFiles = await filesBelow(path.join(build, "static"));
assert.ok(staticFiles.length > 0, "Next static output is empty");
for (const source of staticFiles) {
  const copied = path.join(isolatedApp, ".next/static", path.relative(path.join(build, "static"), source));
  assert.equal(await digest(source), await digest(copied), `Static asset differs after copy: ${source}`);
}
const publicFiles = await filesBelow(path.join(root, "apps/site/public"));
for (const source of publicFiles) {
  const copied = path.join(isolatedApp, "public", path.relative(path.join(root, "apps/site/public"), source));
  assert.equal(await digest(source), await digest(copied), `Public asset differs after copy: ${source}`);
}

const manifest = {
  schemaVersion: "daytrace.standalone/v1",
  standaloneServer: path.relative(root, server),
  tracedSharedContract: path.relative(root, tracedContract),
  tracedSharedConfig: path.relative(root, tracedConfig),
  staticFileCount: staticFiles.length,
  publicFileCount: publicFiles.length,
};
await writeFile(
  path.join(standalone, "daytrace-standalone.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  { mode: 0o644 },
);
console.log(`Standalone verified: ${staticFiles.length} static and ${publicFiles.length} public files copied.`);
