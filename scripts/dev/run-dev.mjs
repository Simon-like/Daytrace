import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
if (existsSync(resolve(root, ".env"))) process.loadEnvFile(resolve(root, ".env"));

function option(name) {
  const exact = process.argv.indexOf(`--${name}`);
  if (exact >= 0) {
    const value = process.argv[exact + 1];
    if (!value || value.startsWith("--")) throw new Error(`--${name} requires a value`);
    return value;
  }
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`));
  return inline?.slice(name.length + 3);
}

if (process.argv.includes("--help")) {
  console.log("Usage: npm run dev -- [--host 127.0.0.1] [--port 3000] [--h5-port 3002]\nStarts desktop Next.js, mobile H5 Next.js and NestJS. API_HOST/API_PORT configure Nest separately.");
  process.exit(0);
}

const siteHost = option("host") ?? process.env.SITE_HOST ?? "127.0.0.1";
const sitePort = option("port") ?? process.env.SITE_PORT ?? "3000";
const h5Port = option("h5-port") ?? process.env.H5_PORT ?? "3002";
for (const [name, port] of [["Site", sitePort], ["H5", h5Port]]) {
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error(`${name} port must be between 1 and 65535`);
}
const apiPort = process.env.API_PORT ?? "3001";
const internalHost = siteHost === "0.0.0.0" || siteHost === "::" ? "127.0.0.1" : siteHost;
const internalOriginHost = internalHost.includes(":") ? `[${internalHost}]` : internalHost;
const suffix = process.platform === "win32" ? ".cmd" : "";
const executable = (name, directory = root) => resolve(directory, `node_modules/.bin/${name}${suffix}`);

for (const project of ["packages/config/tsconfig.json", "packages/contracts/tsconfig.json"]) {
  const built = spawnSync(executable("tsc"), ["-p", project], { cwd: root, stdio: "inherit" });
  if (built.status !== 0) process.exit(built.status ?? 1);
}

const environment = {
  ...process.env,
  API_INTERNAL_ORIGIN: process.env.API_INTERNAL_ORIGIN ?? `http://127.0.0.1:${apiPort}`,
  H5_INTERNAL_ORIGIN: process.env.H5_INTERNAL_ORIGIN ?? `http://${internalOriginHost}:${h5Port}`,
  CONTENT_ROOT: process.env.CONTENT_ROOT ?? "./apps/api/fixtures/content",
};
const children = [];
function launch(name, args, env = environment, directory = root) {
  const child = spawn(executable(name, directory), args, {
    cwd: root,
    env,
    stdio: "inherit",
    detached: process.platform !== "win32",
  });
  children.push(child);
  return child;
}

const api = launch("tsx", ["watch", "--tsconfig", "apps/api/tsconfig.json", "apps/api/src/main.ts"]);
const site = launch("next", ["dev", "apps/site", "--hostname", siteHost, "--port", sitePort], environment, resolve(root, "apps/site"));
const h5 = launch("next", ["dev", "apps/h5", "--hostname", siteHost, "--port", h5Port], environment, resolve(root, "apps/h5"));
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode !== null || child.signalCode !== null) continue;
    if (process.platform !== "win32" && child.pid) {
      try { process.kill(-child.pid, "SIGTERM"); } catch { child.kill("SIGTERM"); }
    } else child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 500).unref();
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
for (const [name, child] of [["api", api], ["site", site], ["h5", h5]]) {
  child.on("error", (error) => {
    console.error(`${name} failed to start: ${error.message}`);
    stop(1);
  });
  child.on("exit", (code, signal) => {
    if (!stopping) {
      console.error(`${name} stopped (${signal ?? code ?? "unknown"}); stopping the other services.`);
      stop(code ?? 1);
    }
  });
}
