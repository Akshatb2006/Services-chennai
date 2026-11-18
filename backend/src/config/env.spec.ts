import { validateEnv } from "./env.js";

const base = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  JWT_ACCESS_SECRET: "a".repeat(32),
  OTP_PEPPER: "b".repeat(32),
};

describe("environment validation", () => {
  it("applies safe defaults", () => {
    const env = validateEnv(base);
    expect(env).toMatchObject({ NODE_ENV: "development", PORT: 4000, OTP_PROVIDER: "none", OTP_TTL_SECONDS: 300, OTP_MAX_ATTEMPTS: 5 });
  });

  it("refuses the development OTP provider in production", () => {
    expect(() => validateEnv({ ...base, NODE_ENV: "production", OTP_PROVIDER: "console" })).toThrow(/not allowed in production/);
  });

  it("requires strong secrets", () => {
    expect(() => validateEnv({ ...base, JWT_ACCESS_SECRET: "short" })).toThrow(/JWT_ACCESS_SECRET/);
    expect(() => validateEnv({ ...base, OTP_PEPPER: undefined })).toThrow(/OTP_PEPPER/);
  });

  describe("production safeguards", () => {
    const prod = { ...base, NODE_ENV: "production", DATABASE_URL: "postgresql://u:p@db.internal:5432/app?sslmode=verify-full", CORS_ORIGINS: "https://ops.example.in" };

    it("accepts a verified-TLS database and https origins", () => {
      expect(validateEnv(prod)).toMatchObject({ NODE_ENV: "production", OTP_PROVIDER: "none" });
      expect(validateEnv({ ...prod, DATABASE_URL: "postgresql://u:p@db:5432/app?sslmode=require" }).NODE_ENV).toBe("production");
      expect(validateEnv({ ...prod, DATABASE_URL: "postgresql://u:p@db:5432/app?sslmode=verify-full&sslrootcert=/certs/ca.crt" }).NODE_ENV).toBe("production");
    });

    it.each([
      ["no sslmode", "postgresql://u:p@db:5432/app"],
      ["sslmode=disable", "postgresql://u:p@db:5432/app?sslmode=disable"],
      ["sslmode=prefer", "postgresql://u:p@db:5432/app?sslmode=prefer"],
      ["sslmode=no-verify", "postgresql://u:p@db:5432/app?sslmode=no-verify"],
      ["libpq require (unverified)", "postgresql://u:p@db:5432/app?sslmode=require&uselibpqcompat=true"],
      ["libpq verify-ca (no host-name check)", "postgresql://u:p@db:5432/app?sslmode=verify-ca&uselibpqcompat=true&sslrootcert=/c/ca.crt"],
    ])("rejects a database URL with %s", (_label, url) => {
      expect(() => validateEnv({ ...prod, DATABASE_URL: url })).toThrow(/DATABASE_URL must use TLS/);
    });

    it.each(["*", "http://ops.example.in", "https://ops.example.in/", "https://*.example.in", "ops.example.in"])("rejects CORS origin %j", (origin) => {
      expect(() => validateEnv({ ...prod, CORS_ORIGINS: origin })).toThrow(/CORS origin/);
    });

    it("parses TRUST_PROXY as a hop count", () => {
      expect(validateEnv(prod).TRUST_PROXY).toBe(0);
      expect(validateEnv({ ...prod, TRUST_PROXY: "true" }).TRUST_PROXY).toBe(1);
      expect(validateEnv({ ...prod, TRUST_PROXY: "2" }).TRUST_PROXY).toBe(2);
      expect(() => validateEnv({ ...prod, TRUST_PROXY: "yes" })).toThrow(/TRUST_PROXY/);
      expect(() => validateEnv({ ...prod, TRUST_PROXY: "9" })).toThrow(/TRUST_PROXY/);
    });

    it("still allows plain local URLs outside production", () => {
      expect(validateEnv({ ...base, DATABASE_URL: "postgresql://u:p@localhost:5433/db", CORS_ORIGINS: "http://localhost:3001" }).NODE_ENV).toBe("development");
    });

    it("requires both secrets and keeps Swagger off unless enabled", () => {
      expect(() => validateEnv({ ...prod, JWT_ACCESS_SECRET: undefined })).toThrow(/JWT_ACCESS_SECRET/);
      expect(() => validateEnv({ ...prod, OTP_PEPPER: prod.JWT_ACCESS_SECRET })).toThrow(/must be different/);
      expect(validateEnv(prod).SWAGGER_ENABLED).toBeUndefined();
    });
  });
});
