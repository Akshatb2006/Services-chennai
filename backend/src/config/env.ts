import { z } from "zod";

/**
 * Environment contract. The app refuses to boot when anything is missing or unsafe,
 * e.g. the development OTP provider in production.
 */
const bool = z
  .enum(["true", "false"])
  .transform((v) => v === "true");

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    DATABASE_URL: z.url().refine((u) => u.startsWith("postgres"), "DATABASE_URL must be a PostgreSQL URL"),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
    /** Comma-separated browser origins allowed by CORS (mobile apps don't need CORS). Empty = none. */
    CORS_ORIGINS: z.string().default(""),
    /**
     * Number of reverse proxies in front of the API whose X-Forwarded-For entries are trusted, so rate
     * limits see the real client IP. "false" = 0 (direct exposure), "true" = 1 (one load balancer).
     * Use 2 for CDN → load balancer → API. Never more than the real number of hops: extra hops let
     * clients spoof their IP.
     */
    TRUST_PROXY: z
      .string()
      .regex(/^(true|false|[0-5])$/, 'TRUST_PROXY must be "false", "true" (1 hop) or a hop count from 0 to 5')
      .default("false")
      .transform((v) => (v === "true" ? 1 : v === "false" ? 0 : Number(v))),
    SWAGGER_ENABLED: bool.optional(),

    JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(180).default(30),
    /** Staff (admin dashboard) sessions are shorter and don't slide. */
    ADMIN_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(1800).default(600),
    ADMIN_SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(72).default(12),

    /** Server-side secret mixed into OTP hashes so a database leak can't be brute-forced offline. */
    OTP_PEPPER: z.string().min(32, "OTP_PEPPER must be at least 32 characters"),
    OTP_PROVIDER: z.enum(["console", "none"]).default("none"),
    OTP_TTL_SECONDS: z.coerce.number().int().min(60).max(900).default(300),
    OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().min(10).max(600).default(30),
    OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
    OTP_MAX_SENDS_PER_HOUR: z.coerce.number().int().min(1).max(20).default(5),

    /** Background scheduler (day-before reminders). Safe on many instances: jobs are claimed in PostgreSQL. */
    SCHEDULER_ENABLED: bool.default(true),
    SCHEDULER_INTERVAL_SECONDS: z.coerce.number().int().min(5).max(3600).default(60),

    /** Global per-IP request budget (per minute). */
    RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(120),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && env.OTP_PROVIDER === "console") {
      ctx.addIssue({
        code: "custom",
        path: ["OTP_PROVIDER"],
        message: "The console OTP provider prints codes to the server log and is not allowed in production. Configure an SMS provider.",
      });
    }
    if (env.NODE_ENV === "production" && env.JWT_ACCESS_SECRET === env.OTP_PEPPER) {
      ctx.addIssue({ code: "custom", path: ["OTP_PEPPER"], message: "OTP_PEPPER and JWT_ACCESS_SECRET must be different" });
    }
    if (env.NODE_ENV === "production") {
      const tls = databaseTlsProblem(env.DATABASE_URL);
      if (tls) ctx.addIssue({ code: "custom", path: ["DATABASE_URL"], message: tls });
      const badOrigins = corsOrigins(env.CORS_ORIGINS).filter((o) => !/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(o));
      if (badOrigins.length) {
        ctx.addIssue({ code: "custom", path: ["CORS_ORIGINS"], message: `In production every CORS origin must be an exact https:// origin (no wildcard, path or trailing slash): ${badOrigins.join(", ")}` });
      }
    }
  });

export type Env = z.output<typeof envSchema>;

export const corsOrigins = (value: string) => value.split(",").map((o) => o.trim()).filter(Boolean);

/**
 * Production databases must be reached over TLS with the server certificate verified.
 * With node-postgres, `sslmode=require` / `verify-ca` / `verify-full` all verify the certificate and host
 * name (unless `uselibpqcompat=true`, which turns `require` into "encrypt without verifying").
 * Returns a message when the URL doesn't meet that, otherwise null.
 */
export function databaseTlsProblem(databaseUrl: string): string | null {
  const params = new URL(databaseUrl).searchParams;
  const mode = params.get("sslmode");
  const libpq = params.get("uselibpqcompat") === "true";
  const verified = mode === "verify-full" || (!libpq && (mode === "require" || mode === "verify-ca"));
  if (verified) return null;
  return `DATABASE_URL must use TLS with certificate verification in production (add sslmode=verify-full; got ${mode ? `sslmode=${mode}${libpq ? " with uselibpqcompat" : ""}` : "no sslmode"}). For a private CA add sslrootcert=/path/to/ca.crt.`;
}

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".") || "(env)"}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join("\n")}`);
  }
  return parsed.data;
}

/** Injection token for the validated environment. */
export const ENV = Symbol("ENV");
