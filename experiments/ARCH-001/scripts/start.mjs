import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const server = path.join(root, "apps/site/.next/standalone/apps/site/server.js");
const children = [
  spawn(process.execPath, [path.join(root, "apps/api/dist/main.js")], {
    cwd: root,
    env: { ...process.env, CONTENT_ROOT: path.join(root, "content"), PORT: "4101" },
    stdio: "inherit",
  }),
  spawn(process.execPath, [server], {
    cwd: path.dirname(server),
    env: {
      ...process.env,
      API_INTERNAL_ORIGIN: "http://127.0.0.1:4101",
      HOSTNAME: "127.0.0.1",
      PORT: "4100",
      NODE_ENV: "production",
    },
    stdio: "inherit",
  }),
];

function stop() {
  for (const child of children) if (child.exitCode === null) child.kill("SIGTERM");
}
for (const child of children) child.on("exit", (code) => {
  if (code && code !== 0) {
    stop();
    process.exitCode = code;
  }
});
process.on("SIGINT", () => { stop(); process.exit(0); });
process.on("SIGTERM", () => { stop(); process.exit(0); });
console.log("ARCH-001: http://127.0.0.1:4100/records/public-arch-sample (Ctrl+C to stop)");
