import { type ArgumentsHost, Catch, type ExceptionFilter } from "@nestjs/common";
import { API_SCHEMA_VERSION, type ApiErrorResponse } from "@daytrace/contracts";
import type { Response } from "express";
import { ApiError } from "./api-error";
import { REQUEST_ID_PATTERN } from "./request-id.middleware";

@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const header = response.getHeader("X-Request-Id");
    const requestId = typeof header === "string" && REQUEST_ID_PATTERN.test(header)
      ? header
      : "internal-error-request";
    const error = exception instanceof ApiError
      ? exception
      : new ApiError(500, "INTERNAL_ERROR", "服务暂时不可用");
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Request-Id", requestId);
    const body: ApiErrorResponse = {
      schemaVersion: API_SCHEMA_VERSION,
      error: {
        code: error.code,
        message: error.publicMessage,
        requestId,
        details: error.details,
      },
    };
    response.status(error.status).json(body);
  }
}
