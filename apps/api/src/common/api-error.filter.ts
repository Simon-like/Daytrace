import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException } from "@nestjs/common";
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
    const request = context.getRequest<{ url: string }>();
    const httpStatus = exception instanceof HttpException ? exception.getStatus() : null;
    const invalidUpload = request.url.startsWith("/api/v1/owner/") && (httpStatus === 400 || httpStatus === 413);
    const uploadError = exception && typeof exception === "object" && "code" in exception && String(exception.code).startsWith("LIMIT_");
    const error = httpStatus === 404 ? new ApiError(404, "RECORD_NOT_FOUND", "请求的内容不存在或当前不可见") : invalidUpload || uploadError ? new ApiError(422, "CONTENT_IMPORT_INVALID", "上传超出文件数量或大小限制") : exception instanceof ApiError
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
