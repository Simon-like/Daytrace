import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const source = path.resolve(process.argv[2] ?? path.join(root, "apps/api/fixtures/content"));
const output = path.resolve(process.argv[3] ?? path.join(root, "ops/cicd/.artifacts/public-content"));
const snapshotModule = await import(pathToFileURL(path.join(root, "apps/api/dist/modules/content/content.snapshot.js")));
const temporary = await mkdtemp(path.join(tmpdir(), "daytrace-public-export-"));

async function load(contentRoot) {
  return snapshotModule.loadContentSnapshot(contentRoot);
}

try {
  await mkdir(path.join(temporary, "private"), { recursive: true });
  await cp(path.join(source, "public"), path.join(temporary, "public"), { recursive: true });
  const candidate = await load(temporary);
  await rm(output, { recursive: true, force: true });
  await mkdir(path.join(output, "private"), { recursive: true });
  await mkdir(path.join(output, "public"), { recursive: true });
  for (const record of candidate.publicRecords) {
    const directoryName = path.basename(record.recordDirectory);
    assert.ok(!["", ".", ".."].includes(directoryName), "Invalid public record directory");
    await cp(record.recordDirectory, path.join(output, "public", directoryName), { recursive: true });
  }
  const exported = await load(output);
  assert.equal(exported.records.length, exported.publicRecords.length, "Unpublished content reached the export");
  const result = {
    schemaVersion: "daytrace.public-content/v1",
    contentRevision: exported.contentRevision,
    publicRecordCount: exported.publicRecords.length,
  };
  await writeFile(path.join(output, "../public-content.json"), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result));
} finally {
  await rm(temporary, { recursive: true, force: true });
}
