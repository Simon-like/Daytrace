import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { ContentSnapshotInvalidError } from "../../common/api-error";
import { loadContentSnapshot } from "./content.snapshot";

const fixtureRoot = resolve(process.cwd(), "apps/api/fixtures/content");

test("snapshot contains only explicit published public records in the public projection", async () => {
  const snapshot = await loadContentSnapshot(fixtureRoot);
  assert.equal(snapshot.records.length, 3);
  assert.equal(snapshot.publicRecords.length, 1);
  assert.ok(snapshot.contentRevision.startsWith("sha256:"));
  const publicJson = JSON.stringify(snapshot.publicRecords);
  assert.ok(!publicJson.includes("PRIVATE_"));
  assert.ok(!publicJson.includes("DRAFT_"));
  const repeated = await loadContentSnapshot(fixtureRoot);
  assert.equal(repeated.contentRevision, snapshot.contentRevision);
});

test("duplicate stable IDs invalidate the whole candidate snapshot", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "daytrace-content-"));
  try {
    await cp(fixtureRoot, temporary, { recursive: true });
    const source = await readFile(join(temporary, "public/draft-note/index.md"), "utf8");
    await writeFile(
      join(temporary, "public/draft-note/index.md"),
      source.replace("rec_7d0c0f2d-8f5b-4f0e-a3a6-777777777777", "rec_7d0c0f2d-8f5b-4f0e-a3a6-111111111111"),
    );
    await assert.rejects(loadContentSnapshot(temporary), (error: unknown) => {
      assert.ok(error instanceof ContentSnapshotInvalidError);
      assert.ok(error.details.some((item) => item.code === "CONTENT_DUPLICATE_ID"));
      return true;
    });
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("source byte changes produce a different content revision", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "daytrace-content-"));
  try {
    await cp(fixtureRoot, temporary, { recursive: true });
    const before = await loadContentSnapshot(temporary);
    const file = join(temporary, "public/engineering-ssr/index.md");
    await writeFile(file, `${await readFile(file, "utf8")}\n补充一个合成字节变化。\n`);
    const after = await loadContentSnapshot(temporary);
    assert.notEqual(after.contentRevision, before.contentRevision);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("private-only edits never change the public revision or pagination fingerprint", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "daytrace-private-revision-"));
  try {
    await cp(fixtureRoot, temporary, { recursive: true });
    const before = await loadContentSnapshot(temporary);
    const file = join(temporary, "private/owner-canary/index.md");
    await writeFile(file, `${await readFile(file, "utf8")}\n仅给自己的新认识。\n`);
    const after = await loadContentSnapshot(temporary);
    assert.notEqual(after.contentRevision, before.contentRevision);
    assert.equal(after.publicContentRevision, before.publicContentRevision);
  } finally { await rm(temporary, { recursive: true, force: true }); }
});
