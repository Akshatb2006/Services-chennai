import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";
import type { ApiErrorBody, ApiErrorCode } from "@homecare/contracts";
import type { Request, Response } from "express";
import { AppException } from "./app-exception.js";

const byStatus: Partial<Record<number, ApiErrorCode>> = {
  400: "validation_failed",
  401: "unauthorized",
  403: "forbidden",
  404: "not_found",
  409: "conflict",
  422: "validation_failed",
  429: "rate_limited",
  503: "service_unavailable",
};

/** Turns every error into the { error: { code, message, ... } } envelope. Never leaks internals. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("Http");

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { id?: string }>();
    const requestId = typeof req.id === "string" ? req.id : undefined;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: ApiErrorBody["error"] = { code: "internal_error", message: "Something went wrong. Please try again." };

    if (exception instanceof AppException) {
      status = exception.getStatus();
      body = { code: exception.code, message: (exception.getResponse() as { message: string }).message, ...exception.extra };
    } else if (exception instanceof ThrottlerException) {
      status = HttpStatus.TOO_MANY_REQUESTS;
      const retry = Number(res.getHeader("Retry-After"));
      body = { code: "rate_limited", message: "Too many requests. Please wait and try again.", ...(retry > 0 && { retryAfterSeconds: retry }) };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      const raw = typeof r === "string" ? r : (r as { message?: unknown }).message;
      const message = typeof raw === "string" ? raw : exception.message;
      body = { code: byStatus[status] ?? (status >= 500 ? "internal_error" : "validation_failed"), message };
    }

    if (status >= 500) this.logger.error({ err: exception, requestId }, "Unhandled error");
    if (body.retryAfterSeconds) res.setHeader("Retry-After", String(body.retryAfterSeconds));
    res.status(status).json({ error: { ...body, ...(requestId && { requestId }) } } satisfies ApiErrorBody);
  }
}
