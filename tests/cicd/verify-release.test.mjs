import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createReleaseManifest } from "../../scripts/ci/release-manifest.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const script = path.join(root, "scripts/ci/verify-release.mjs");
const manifest = createReleaseManifest({
  releaseId: "release-123.1",
  gitSha: "0381904161d095dd8ca14c24a72a37ffa0cee9fa",
  repository: "Simon-like/Daytrace",
  siteImage: `ghcr.io/simon-like/daytrace/site@sha256:${"a".repeat(64)}`,
  apiImage: `ghcr.io/simon-like/daytrace/api@sha256:${"b".repeat(64)}`,
  contentRevision: `sha256:${"c".repeat(64)}`,
  contractVersion: "1.0.0",
  apiSchemaVersion: "1.0",
  ciRunUrl: "https://github.com/Simon-like/Daytrace/actions/runs/122",
  builtAt: "2026-10-30T00:00:00.000Z",
  targetArchitecture: "linux/amd64",
});
const run = {
  databaseId: 123,
  status: "completed",
  conclusion: "success",
  event: "workflow_run",
  headBranch: "main",
  headSha: manifest.source.gitSha,
  workflowName: "release-build",
  url: "https://github.com/Simon-like/Daytrace/actions/runs/123",
};

async function verify(runValue) {
  const directory = await mkdtemp(path.join(tmpdir(), "daytrace-release-verify-"));
  const manifestPath = path.join(directory, "manifest.json");
  const runPath = path.join(directory, "run.json");
  await writeFile(manifestPath, JSON.stringify(manifest));
  await writeFile(runPath, JSON.stringify(runValue));
  return spawnSync(process.execPath, [script, "release", "--run", runPath, "--manifest", manifestPath], {
    env: { ...process.env, GITHUB_REPOSITORY: "Simon-like/Daytrace" },
    encoding: "utf8",
  });
}

test("trusted release evidence accepts only the matching main SHA", async () => {
  assert.equal((await verify(run)).status, 0);
  assert.notEqual((await verify({ ...run, headSha: "a".repeat(40) })).status, 0);
  assert.notEqual((await verify({ ...run, headBranch: "agent/CICD-001/kimi" })).status, 0);
  assert.notEqual((await verify({ ...run, event: "pull_request" })).status, 0);
});
