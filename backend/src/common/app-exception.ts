import { HttpException, HttpStatus } from "@nestjs/common";
import type { ApiErrorCode } from "@homecare/contracts";

/** Application error with a stable machine-readable code (see ApiErrorCode in @homecare/contracts). */
export class AppException extends HttpException {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    status: HttpStatus,
    readonly extra: { fields?: Record<string, string>; retryAfterSeconds?: number } = {},
  ) {
    super({ code, message }, status);
  }
}

export const notFound = (what = "Resource") => new AppException("not_found", `${what} not found`, HttpStatus.NOT_FOUND);
