import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,128}$/;

export interface RequestWithId extends Request {
  requestId: string;
}

export class RequestIdMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const incoming = request.headers["x-request-id"];
    const candidate = Array.isArray(incoming) ? incoming[0] : incoming;
    const requestId = candidate !== undefined && REQUEST_ID_PATTERN.test(candidate)
      ? candidate
      : randomUUID();
    (request as RequestWithId).requestId = requestId;
    response.setHeader("X-Request-Id", requestId);
    next();
  }
}
