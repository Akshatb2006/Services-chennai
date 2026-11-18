import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
export const hmac = (key: string, value: string) => createHmac("sha256", key).update(value).digest("hex");

/** Uniformly random numeric code (CSPRNG), zero-padded. */
export const randomDigits = (length: number) => String(randomInt(0, 10 ** length)).padStart(length, "0");

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

/** Constant-time comparison of two hex digests. */
export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
