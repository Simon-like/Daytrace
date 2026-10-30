import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateReleaseManifest } from "./release-manifest.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  assert.ok(index >= 0 && process.argv[index + 1], `${name} is required`);
  return process.argv[index + 1];
}

async function json(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

function verifyRun(run, workflow, event) {
  assert.equal(run.status, "completed");
  assert.equal(run.conclusion, "success", `${workflow} run did not pass`);
  assert.equal(run.event, event);
  assert.equal(run.headBranch, "main", "Deployment evidence must originate on main");
  assert.match(run.headSha, /^[0-9a-f]{40}$/);
  assert.equal(run.workflowName, workflow, "Unexpected evidence workflow");
  assert.match(run.url, /^https:\/\/github\.com\//);
}

const mode = process.argv[2];
const manifest = validateReleaseManifest(await json(argument("--manifest")));
if (mode === "release") {
  const run = await json(argument("--run"));
  verifyRun(run, "release-build", "workflow_run");
  assert.equal(manifest.source.gitSha, run.headSha, "Manifest SHA differs from release run");
  assert.equal(manifest.source.repository, process.env.GITHUB_REPOSITORY);
  console.log(`Release ${manifest.releaseId} verified against trusted run ${run.databaseId}.`);
} else if (mode === "staging") {
  const run = await json(argument("--run"));
  const evidence = await json(argument("--evidence"));
  verifyRun(run, "deploy-staging", "workflow_dispatch");
  assert.equal(run.headBranch, "main");
  assert.equal(evidence.schemaVersion, "daytrace.staging-evidence/v1");
  assert.equal(evidence.releaseId, manifest.releaseId);
  assert.equal(evidence.gitSha, manifest.source.gitSha);
  assert.deepEqual(evidence.images, manifest.images);
  assert.equal(evidence.status, "verified");
  assert.equal(evidence.stagingRunUrl, run.url);
  assert.ok(!Number.isNaN(Date.parse(evidence.verifiedAt)));
  console.log(`Staging evidence for ${manifest.releaseId} verified against run ${run.databaseId}.`);
} else {
  throw new Error("Usage: verify-release.mjs release|staging --run run.json --manifest manifest.json [--evidence evidence.json]");
}
