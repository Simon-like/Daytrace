import assert from "node:assert/strict";
import { cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const build = path.join(root, "apps/site/.next");
const standalone = path.join(build, "standalone");
const server = path.join(standalone, "apps/site/server.js");

async function findBundledContract(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const found = await findBundledContract(target);
      if (found) return found;
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      const body = await readFile(target, "utf8");
      if (body.includes("PUBLIC_ARTICLE_INVALID") && body.includes("1.0.0-arch.1")) return target;
    }
  }
  return null;
}

await stat(server);
const contract = await findBundledContract(path.join(standalone, "apps/site/.next/server"));
assert.ok(contract, "Shared runtime contract was not found in standalone server output");
const isolatedApp = path.dirname(server);
await mkdir(path.join(isolatedApp, ".next"), { recursive: true });
await cp(path.join(build, "static"), path.join(isolatedApp, ".next/static"), { recursive: true });
try {
  await cp(path.join(root, "apps/site/public"), path.join(isolatedApp, "public"), { recursive: true });
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const manifest = {
  generatedAt: new Date().toISOString(),
  node: process.version,
  standaloneServer: path.relative(root, server),
  tracedSharedContract: path.relative(root, contract),
  sharedContractTraceForm: "bundled-server-chunk",
  staticCopied: true,
};
await mkdir(path.join(root, "evidence"), { recursive: true });
await writeFile(path.join(root, "evidence/standalone-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log("Standalone prepared with bundled shared contract and static assets.");
