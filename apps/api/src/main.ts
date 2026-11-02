import { resolve } from "node:path";
import { parseApiRuntimeConfig } from "@daytrace/config";
import { createApiApplication } from "./bootstrap";

async function bootstrap(): Promise<void> {
  const config = parseApiRuntimeConfig(process.env, resolve(__dirname, "../fixtures/content"));
  const demo = process.env.DAYTRACE_DEMO === "1";
  if (demo && (config.host !== "127.0.0.1" || process.env.NODE_ENV === "production" ||
      resolve(config.contentRoot) !== resolve(__dirname, "../fixtures/demo"))) {
    throw new Error("Demo accepts only loopback listening and bundled synthetic content");
  }
  const app = await createApiApplication(resolve(process.cwd(), config.contentRoot), true,
    demo ? process.env.PUBLIC_ORIGIN ?? "http://127.0.0.1:3000" : undefined);
  await app.listen(config.port, config.host);
}

void bootstrap();
