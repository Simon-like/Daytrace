import { createApiApplication } from "../../../apps/api/src/bootstrap";
const root = process.argv[2];
if (!root) throw new Error("A temporary synthetic content root is required");
void (async () => {
  const app = await createApiApplication(root, false, process.env.PUBLIC_ORIGIN ?? "http://127.0.0.1:3290");
  await app.listen(Number(process.env.API_PORT ?? 3291), "127.0.0.1");
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => { void app.close().then(() => process.exit(0)); });
})();
