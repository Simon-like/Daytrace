import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { INestApplication } from "@nestjs/common";
import { ExpressAdapter } from "@nestjs/platform-express";
import type { NextFunction, Request, Response } from "express";
import { AppModule } from "./app.module";
import { ApiErrorFilter } from "./common/api-error.filter";
import { RequestIdMiddleware } from "./common/request-id.middleware";

export async function createApiApplication(contentRoot: string, logger = false, demoOrigin?: string): Promise<INestApplication> {
  if (demoOrigin !== undefined) {
    const origin = new URL(demoOrigin);
    if (process.env.NODE_ENV === "production" || !["127.0.0.1", "localhost"].includes(origin.hostname) ||
        origin.protocol !== "http:" || origin.username || origin.password || origin.pathname !== "/") {
      throw new Error("Demo authentication requires a non-production loopback origin");
    }
  }
  const app = await NestFactory.create(AppModule.register(contentRoot, demoOrigin), new ExpressAdapter(), {
    logger: logger ? ["log", "error", "warn"] as ("log" | "error" | "warn")[] : false,
  });
  const requestId = new RequestIdMiddleware();
  app.use((request: Request, response: Response, next: NextFunction) => requestId.use(request, response, next));
  app.setGlobalPrefix("api/v1");
  app.useGlobalFilters(new ApiErrorFilter());
  app.enableShutdownHooks();
  await app.init();
  return app;
}
