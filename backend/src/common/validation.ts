import { HttpStatus, StandardSchemaValidationPipe } from "@nestjs/common";
import { AppException } from "./app-exception.js";

/** Zod (Standard Schema) validation → 422 validation_failed with per-field messages. */
export function createValidationPipe() {
  return new StandardSchemaValidationPipe({
    exceptionFactory: (issues) => {
      const fields: Record<string, string> = {};
      for (const issue of issues) {
        const path = (issue.path ?? []).map((s) => (typeof s === "object" ? String(s.key) : String(s))).join(".") || "_";
        fields[path] ??= issue.message;
      }
      const first = Object.values(fields)[0] ?? "Invalid request";
      return new AppException("validation_failed", first, HttpStatus.UNPROCESSABLE_ENTITY, { fields });
    },
  });
}
