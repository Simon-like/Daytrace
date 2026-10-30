import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const packages = {
  next: "16.4.3",
  react: "19.3.1",
  "react-dom": "19.3.1",
  "@nestjs/common": "12.3.2",
  "@nestjs/core": "12.3.2",
  "@nestjs/platform-express": "12.3.2",
  rxjs: "7.8.2",
  "reflect-metadata": "0.2.2",
  typescript: "7.0.2",
  pnpm: "11.23.0",
  tsx: "4.23.15",
  marked: "18.1.2",
  "gray-matter": "4.0.3",
  "sanitize-html": "2.18.1",
  "@types/node": "24.19.2",
  "@types/react": "19.3.0",
  "@types/react-dom": "19.3.0",
  "@types/express": "5.0.6",
  "@types/sanitize-html": "2.16.2",
};

const direct = await Promise.all(Object.entries(packages).map(async ([name, version]) => {
  const response = await fetch(`https://registry.npmjs.org/${name.replace("/", "%2f")}`);
  if (!response.ok) throw new Error(`Registry lookup failed for ${name}: ${response.status}`);
  const metadata = await response.json();
  return {
    name,
    version,
    releasedAt: metadata.time?.[version] ?? "unavailable",
    registryLatestAtCapture: metadata["dist-tags"]?.latest ?? "unavailable",
    declaredNodeEngines: metadata.versions?.[version]?.engines?.node ?? null,
  };
}));

const evidence = {
  capturedAt: new Date().toISOString(),
  selectionDate: "2026-10-30",
  runtime: { node: process.version, platform: process.platform, arch: process.arch },
  supportSources: {
    node: "https://nodejs.org/en/about/previous-releases",
    nextStandalone: "https://nextjs.org/docs/app/api-reference/config/next-config-js/output",
    pnpmBuildPermissions: "https://pnpm.io/settings/build#allowbuilds",
  },
  selectionBasis: "Exact stable versions selected from npm registry on the selection date; peer ranges checked with pnpm peers check and the production build/test suite. Node 24 is the owner-provided supported LTS runtime, not a claim that Node 26 was unavailable.",
  direct,
};
await mkdir(path.join(root, "evidence"), { recursive: true });
await writeFile(path.join(root, "evidence/version-matrix.json"), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Captured ${direct.length} exact package versions.`);
