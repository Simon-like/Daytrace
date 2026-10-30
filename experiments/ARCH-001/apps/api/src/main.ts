import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ApiErrorFilter } from "./api-error.filter";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const contentRoot = process.env.CONTENT_ROOT;
  if (!contentRoot) throw new Error("CONTENT_ROOT is required");

  const portText = process.env.PORT ?? "4101";
  const port = Number(portText);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid TCP port");
  }

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api/v1");
  app.useGlobalFilters(new ApiErrorFilter());
  app.enableShutdownHooks();
  await app.listen(port, process.env.HOST ?? "127.0.0.1");
}

void bootstrap();
