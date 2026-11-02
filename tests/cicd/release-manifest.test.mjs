import assert from "node:assert/strict";
import { test } from "node:test";
import { createReleaseManifest, validateReleaseManifest } from "../../scripts/ci/release-manifest.mjs";

const valid = Object.freeze({
  releaseId: "release-123.1",
  gitSha: "0381904161d095dd8ca14c24a72a37ffa0cee9fa",
  repository: "Simon-like/Daytrace",
  siteImage: `ghcr.io/simon-like/daytrace/site@sha256:${"a".repeat(64)}`,
  apiImage: `ghcr.io/simon-like/daytrace/api@sha256:${"b".repeat(64)}`,
  contentRevision: `sha256:${"c".repeat(64)}`,
  contractVersion: "1.0.0",
  apiSchemaVersion: "1.0",
  ciRunUrl: "https://github.com/Simon-like/Daytrace/actions/runs/123",
  builtAt: "2026-10-30T00:00:00.000Z",
  targetArchitecture: "linux/amd64",
});

test("release manifest preserves immutable images and explicit evidence gaps", () => {
  const manifest = createReleaseManifest(valid);
  assert.equal(manifest.images.site, valid.siteImage);
  assert.equal(manifest.evidence.stagingRunUrl, null);
  assert.equal(manifest.timestamps.approvedAt, null);
  assert.deepEqual(validateReleaseManifest(manifest), manifest);
});

test("release manifest rejects mutable image tags and malformed source SHAs", () => {
  assert.throws(() => createReleaseManifest({ ...valid, siteImage: "ghcr.io/simon-like/daytrace/site:latest" }), /digest/);
  assert.throws(() => createReleaseManifest({ ...valid, gitSha: "0381904" }), /full lowercase/);
  assert.throws(() => createReleaseManifest({ ...valid, ciRunUrl: "http://example.com/run" }), /HTTPS/);
});
