import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const sha = /^[0-9a-f]{40}$/;
const digest = /^sha256:[0-9a-f]{64}$/;
const imageDigest = /^[a-z0-9.-]+(?::\d+)?(?:\/[a-z0-9._-]+)+@sha256:[0-9a-f]{64}$/;

export function createReleaseManifest(input) {
  assert.match(input.releaseId, /^[a-z0-9][a-z0-9.-]{2,127}$/, "Invalid release ID");
  assert.match(input.gitSha, sha, "Git SHA must be a full lowercase commit");
  assert.match(input.siteImage, imageDigest, "Site image must be pinned by digest");
  assert.match(input.apiImage, imageDigest, "API image must be pinned by digest");
  assert.match(input.contentRevision, digest, "Invalid public content revision");
  assert.match(input.contractVersion, /^\d+\.\d+\.\d+$/, "Invalid contract package version");
  assert.match(input.apiSchemaVersion, /^\d+\.\d+$/, "Invalid API schema version");
  assert.match(input.targetArchitecture, /^linux\/(?:amd64|arm64)$/, "Unsupported target architecture");
  const ciRunUrl = new URL(input.ciRunUrl);
  assert.equal(ciRunUrl.protocol, "https:", "CI evidence must use HTTPS");
  assert.ok(!Number.isNaN(Date.parse(input.builtAt)), "Invalid build timestamp");
  return {
    schemaVersion: "daytrace.release/v1",
    releaseId: input.releaseId,
    source: { repository: input.repository, gitSha: input.gitSha },
    images: { site: input.siteImage, api: input.apiImage },
    contract: { packageVersion: input.contractVersion, apiSchemaVersion: input.apiSchemaVersion },
    content: { publicRevision: input.contentRevision },
    evidence: { ciRunUrl: input.ciRunUrl, stagingRunUrl: null },
    timestamps: { builtAt: input.builtAt, approvedAt: null },
    platform: input.targetArchitecture,
    runtime: {
      configSchema: "daytrace.runtime-config/v1",
      migration: "none",
      nextPublicBuildValues: {},
    },
  };
}

export function validateReleaseManifest(manifest) {
  assert.equal(manifest.schemaVersion, "daytrace.release/v1");
  return createReleaseManifest({
    releaseId: manifest.releaseId,
    gitSha: manifest.source.gitSha,
    repository: manifest.source.repository,
    siteImage: manifest.images.site,
    apiImage: manifest.images.api,
    contentRevision: manifest.content.publicRevision,
    contractVersion: manifest.contract.packageVersion,
    apiSchemaVersion: manifest.contract.apiSchemaVersion,
    ciRunUrl: manifest.evidence.ciRunUrl,
    builtAt: manifest.timestamps.builtAt,
    targetArchitecture: manifest.platform,
  });
}

async function main() {
  const outputIndex = process.argv.indexOf("--output");
  const output = path.resolve(outputIndex >= 0 ? process.argv[outputIndex + 1] : "ops/cicd/.artifacts/release/manifest.json");
  const contractPackage = JSON.parse(await readFile(path.join(root, "packages/contracts/package.json"), "utf8"));
  const contractSource = await readFile(path.join(root, "packages/contracts/src/index.ts"), "utf8");
  const apiSchemaVersion = contractSource.match(/API_SCHEMA_VERSION = "([^"]+)"/)?.[1];
  assert.ok(apiSchemaVersion, "API schema version not found");
  const manifest = createReleaseManifest({
    releaseId: process.env.RELEASE_ID,
    gitSha: process.env.GIT_SHA,
    repository: process.env.GITHUB_REPOSITORY,
    siteImage: process.env.SITE_IMAGE,
    apiImage: process.env.API_IMAGE,
    contentRevision: process.env.CONTENT_REVISION,
    contractVersion: contractPackage.version,
    apiSchemaVersion,
    ciRunUrl: process.env.CI_RUN_URL,
    builtAt: process.env.BUILT_AT ?? new Date().toISOString(),
    targetArchitecture: process.env.TARGET_ARCHITECTURE ?? "linux/amd64",
  });
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o644 });
  console.log(`Release manifest written to ${output}`);
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
