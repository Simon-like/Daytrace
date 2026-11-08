import { resolve } from "node:path";
import { parseApiRuntimeConfig } from "@daytrace/config";
import { createApiApplication } from "./bootstrap";
import { authOptionsFromEnvironment } from "./modules/auth/auth.config";
import { OpenidAuth0Client } from "./modules/auth/openid-auth0.client";

async function bootstrap(): Promise<void> {
  const config = parseApiRuntimeConfig(process.env, resolve(__dirname, "../fixtures/content"));
  const demo = process.env.DAYTRACE_DEMO === "1";
  if (demo && (config.host !== "127.0.0.1" || process.env.NODE_ENV === "production" ||
      resolve(config.contentRoot) !== resolve(__dirname, "../fixtures/demo"))) {
    throw new Error("Demo accepts only loopback listening and bundled synthetic content");
  }
  const auth = demo || process.env.AUTH_PROVIDER === undefined
    ? undefined
    : authOptionsFromEnvironment(process.env, new OpenidAuth0Client());
  const app = await createApiApplication(resolve(process.cwd(), config.contentRoot), true,
    demo ? process.env.PUBLIC_ORIGIN ?? "http://127.0.0.1:3000" : undefined, auth, demo ? process.env.DEMO_H5_ORIGIN : undefined);
  await app.listen(config.port, config.host);
}

void bootstrap();
