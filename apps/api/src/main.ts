import { resolve } from "node:path";
import { parseApiRuntimeConfig } from "@daytrace/config";
import { createApiApplication } from "./bootstrap";

async function bootstrap(): Promise<void> {
  const config = parseApiRuntimeConfig(process.env, resolve(__dirname, "../fixtures/content"));
  const app = await createApiApplication(resolve(process.cwd(), config.contentRoot), true);
  await app.listen(config.port, config.host);
}

void bootstrap();
