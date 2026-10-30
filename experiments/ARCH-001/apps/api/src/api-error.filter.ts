import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { ContentValidationError, RecordNotFoundError } from "./errors";

@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const requestId = randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = "INTERNAL_ERROR";
    let message = "Request failed";
    let issues: unknown;

    if (exception instanceof RecordNotFoundError) {
      status = HttpStatus.NOT_FOUND;
      code = "RECORD_NOT_FOUND";
      message = "Record not found";
    } else if (exception instanceof ContentValidationError) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
      code = "CONTENT_INVALID";
      message = "Content validation failed";
      issues = exception.issues;
    }

    response.setHeader("x-request-id", requestId);
    response.setHeader("Cache-Control", "no-store");
    response.status(status).json({
      error: {
        code,
        message,
        requestId,
        ...(issues === undefined ? {} : { issues }),
      },
    });
  }
}
