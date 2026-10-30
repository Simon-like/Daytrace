import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const eventPath = process.env.GITHUB_EVENT_PATH;
assert.ok(eventPath, "GITHUB_EVENT_PATH is required");
const event = JSON.parse(await readFile(eventPath, "utf8"));
const run = event.workflow_run;
assert.ok(run, "This verifier requires a workflow_run event");
assert.equal(event.repository?.full_name, process.env.GITHUB_REPOSITORY, "Cross-repository run rejected");
assert.equal(run.event, "push", "Release source CI must come from a push");
assert.equal(run.head_branch, "main", "Release source CI must run on main");
assert.equal(run.status, "completed");
assert.equal(run.conclusion, "success", "Source CI did not pass");
assert.equal(run.path, ".github/workflows/ci.yml", "Unexpected source workflow");
assert.match(run.head_sha, /^[0-9a-f]{40}$/);
assert.equal(run.head_sha, process.env.EXPECTED_GIT_SHA, "Checked-out SHA differs from trusted CI SHA");
assert.equal((run.pull_requests ?? []).length, 0, "PR-originated workflow runs are not trusted for release");
console.log(`Trusted main CI verified for ${run.head_sha}.`);
