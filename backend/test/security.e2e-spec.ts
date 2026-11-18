import { createTestApp, type TestContext } from "./helpers.js";

describe("HTTP hardening", () => {
  let t: TestContext;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.app.close();
  });

  it("sends no-store and security headers on every response", async () => {
    for (const res of [await t.http().get("/health"), await t.http().get("/customers/me"), await t.http().post("/auth/send-otp").send({})]) {
      expect(res.headers["cache-control"]).toBe("no-store");
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["x-frame-options"]).toBe("DENY");
      expect(res.headers["x-powered-by"]).toBeUndefined();
    }
  });

  it("returns the error envelope without internals for unknown routes and bad JSON", async () => {
    const missing = await t.http().get("/does-not-exist").expect(404);
    expect(missing.body).toEqual({ error: expect.objectContaining({ code: "not_found" }) });
    const bad = await t.http().post("/auth/send-otp").set("content-type", "application/json").send("{not json").expect(400);
    expect(JSON.stringify(bad.body)).not.toMatch(/stack|at .*\.js|SyntaxError/);
  });

  it("serves liveness without the database and readiness with it", async () => {
    expect((await t.http().get("/health/live").expect(200)).body).toEqual({ data: { status: "ok" } });
    expect((await t.http().get("/health").expect(200)).body).toEqual({ data: { status: "ok", database: "ok" } });
  });

  it("reads the client IP from exactly one proxy hop (TRUST_PROXY=true)", () => {
    expect(t.app.getHttpAdapter().getInstance().get("trust proxy")).toBe(1);
  });

  it("rejects oversized bodies", async () => {
    await t.http().post("/auth/send-otp").send({ phone: "9".repeat(40_000) }).expect(413);
  });
});
