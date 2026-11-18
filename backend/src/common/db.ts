import { HttpStatus } from "@nestjs/common";
import type { Prisma } from "../generated/prisma/client.js";
import { AppException } from "./app-exception.js";

/** Row lock for the duration of the transaction: serialises concurrent operations on one request. */
export async function lockRequest(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT id FROM service_requests WHERE id = ${id}::uuid FOR UPDATE`;
}

export async function lockProfessional(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT id FROM professionals WHERE id = ${id}::uuid FOR UPDATE`;
}

/** Unique-constraint violation (Prisma P2002 / Postgres 23505), e.g. a partial index guarding double booking. */
export function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string }; message?: string };
  return e?.code === "P2002" || e?.cause?.code === "23505" || /23505|unique constraint/i.test(String(e?.message ?? ""));
}

export const conflict = (code: "assignment_conflict" | "invalid_transition" | "conflict" | "not_eligible", message: string) =>
  new AppException(code, message, HttpStatus.CONFLICT);
