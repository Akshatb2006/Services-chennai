import { sha256 } from "../src/common/crypto.js";
import { createTestApp, nextIp, type TestContext } from "./helpers.js";

const PHONE = "+919840012345";

describe("Auth (OTP + sessions)", () => {
  let t: TestContext;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.app.close();
  });
  beforeEach(async () => {
    await t.reset();
  });

  const send = (phone: string, ip = nextIp()) => t.http().post("/auth/send-otp").set("x-forwarded-for", ip).send({ phone });
  const verify = (phone: string, code: string | undefined, ip = nextIp()) => t.http().post("/auth/verify-otp").set("x-forwarded-for", ip).send({ phone, code });

  describe("send-otp", () => {
    it("normalises Indian numbers to E.164 and sends a 6-digit code", async () => {
      const res = await send("098400 12345").expect(200);
      expect(res.body).toEqual({ data: { expiresInSeconds: 300, resendAfterSeconds: 30 } });
      expect(t.sms.sent).toHaveLength(1);
      expect(t.sms.sent[0].phone).toBe(PHONE);
      expect(t.sms.sent[0].code).toMatch(/^\d{6}$/);
    });

    it("never returns the code and never stores it in plaintext", async () => {
      const res = await send(PHONE).expect(200);
      const code = t.sms.lastCode(PHONE)!;
      expect(JSON.stringify(res.body)).not.toContain(code);
      const rows = await t.prisma.otpChallenge.findMany();
      expect(rows).toHaveLength(1);
      expect(rows[0].codeHash).not.toContain(code);
      expect(rows[0].codeHash).toMatch(/^[0-9a-f]{64}$/);
      expect(rows[0].codeHash).not.toBe(sha256(code)); // peppered HMAC, not a bare hash
    });

    it.each(["12345", "+14155550100", "5840012345", "abcdefghij", ""])("rejects invalid number %j", async (phone) => {
      const res = await send(phone).expect(422);
      expect(res.body.error.code).toBe("validation_failed");
      expect(res.body.error.fields.phone).toBeDefined();
      expect(t.sms.sent).toHaveLength(0);
    });

    it("enforces the resend cooldown, then allows a new code that replaces the old one", async () => {
      await send(PHONE).expect(200);
      const first = t.sms.lastCode(PHONE)!;
      const blocked = await send(PHONE).expect(429);
      expect(blocked.body.error.code).toBe("otp_cooldown");
      expect(blocked.body.error.retryAfterSeconds).toBeGreaterThan(0);
      expect(blocked.headers["retry-after"]).toBeDefined();

      t.clock.advance(31);
      await send(PHONE).expect(200);
      const second = t.sms.lastCode(PHONE)!;
      if (first !== second) {
        const old = await verify(PHONE, first).expect(400);
        expect(old.body.error.code).toBe("otp_invalid");
      }
      await verify(PHONE, second).expect(200);
    });

    it("caps codes per number per hour", async () => {
      for (let i = 0; i < 5; i++) {
        await send(PHONE).expect(200);
        t.clock.advance(31);
      }
      const res = await send(PHONE).expect(429);
      expect(res.body.error.code).toBe("rate_limited");
      t.clock.advance(3600);
      await send(PHONE).expect(200);
    });

    it("rate-limits send-otp per client IP", async () => {
      const ip = nextIp();
      for (let i = 0; i < 5; i++) await send(`+91984001230${i}`, ip).expect(200);
      const res = await send("+919840012309", ip).expect(429);
      expect(res.body.error.code).toBe("rate_limited");
      await send("+919840012309", nextIp()).expect(200); // other clients unaffected
    });

    it("reports an outage honestly and leaves no usable code when SMS delivery fails", async () => {
      t.sms.failNext = true;
      const res = await send(PHONE).expect(503);
      expect(res.body.error.code).toBe("service_unavailable");
      expect(await t.prisma.otpChallenge.count()).toBe(0);
    });
  });

  describe("verify-otp", () => {
    it("signs in a new customer and creates the account and session", async () => {
      await send(PHONE).expect(200);
      const res = await verify(PHONE, t.sms.lastCode(PHONE)).expect(200);
      const data = res.body.data;
      expect(data.accessToken).toEqual(expect.any(String));
      expect(data.refreshToken.length).toBeGreaterThanOrEqual(40);
      expect(data.customer).toMatchObject({ phone: PHONE, fullName: null, profileComplete: false });
      expect(await t.prisma.user.count()).toBe(1);
      const session = await t.prisma.session.findFirstOrThrow();
      expect(session.refreshTokenHash).toBe(sha256(data.refreshToken));
    });

    it("signs an existing customer back in without duplicating the account", async () => {
      await t.signIn(PHONE, { fullName: "Asha" });
      t.clock.advance(31);
      await send(PHONE).expect(200);
      const res = await verify(PHONE, t.sms.lastCode(PHONE)).expect(200);
      expect(res.body.data.customer).toMatchObject({ fullName: "Asha", profileComplete: true });
      expect(await t.prisma.user.count()).toBe(1);
      expect(await t.prisma.session.count()).toBe(2);
    });

    it("rejects a wrong code with a generic message", async () => {
      await send(PHONE).expect(200);
      const wrong = t.sms.lastCode(PHONE) === "000000" ? "111111" : "000000";
      const res = await verify(PHONE, wrong).expect(400);
      expect(res.body.error).toMatchObject({ code: "otp_invalid" });
    });

    it("responds identically for numbers that never requested a code (no enumeration)", async () => {
      await send(PHONE).expect(200);
      const known = await verify(PHONE, "000001");
      const unknown = await verify("+919000000001", "000001");
      expect(unknown.status).toBe(known.status);
      expect(unknown.body.error.message).toBe(known.body.error.message);
    });

    it("expires codes", async () => {
      await send(PHONE).expect(200);
      t.clock.advance(301);
      const res = await verify(PHONE, t.sms.lastCode(PHONE)).expect(400);
      expect(res.body.error.code).toBe("otp_invalid");
    });

    it("locks the code after the maximum number of attempts, even if the right code follows", async () => {
      await send(PHONE).expect(200);
      const code = t.sms.lastCode(PHONE)!;
      const wrong = code === "000000" ? "111111" : "000000";
      for (let i = 0; i < 5; i++) await verify(PHONE, wrong).expect(400);
      await verify(PHONE, code).expect(400);
    });

    it("accepts each code only once", async () => {
      await send(PHONE).expect(200);
      const code = t.sms.lastCode(PHONE);
      await verify(PHONE, code).expect(200);
      await verify(PHONE, code).expect(400);
    });

    it("validates the request body", async () => {
      const res = await verify(PHONE, "12ab").expect(422);
      expect(res.body.error.fields.code).toBeDefined();
    });
  });

  describe("sessions", () => {
    it("requires a valid access token on protected routes", async () => {
      expect((await t.http().get("/customers/me").expect(401)).body.error.code).toBe("unauthorized");
      expect((await t.http().get("/customers/me").set("authorization", "Bearer not-a-jwt").expect(401)).body.error.code).toBe("session_expired");
    });

    it("rotates refresh tokens", async () => {
      const s = await t.signIn();
      const res = await t.http().post("/auth/refresh").send({ refreshToken: s.refreshToken }).expect(200);
      expect(res.body.data.refreshToken).not.toBe(s.refreshToken);
      await t.http().get("/customers/me").set("authorization", `Bearer ${res.body.data.accessToken}`).expect(200);
    });

    it("revokes the session when an already-used refresh token is replayed", async () => {
      const s = await t.signIn();
      const rotated = (await t.http().post("/auth/refresh").send({ refreshToken: s.refreshToken }).expect(200)).body.data;
      const replay = await t.http().post("/auth/refresh").send({ refreshToken: s.refreshToken }).expect(401);
      expect(replay.body.error.code).toBe("session_expired");
      // The legitimate holder's new tokens are now dead too.
      await t.http().post("/auth/refresh").send({ refreshToken: rotated.refreshToken }).expect(401);
      await t.http().get("/customers/me").set("authorization", `Bearer ${rotated.accessToken}`).expect(401);
      const session = await t.prisma.session.findFirstOrThrow();
      expect(session.revokedReason).toBe("refresh_token_reuse");
    });

    it("expires refresh tokens", async () => {
      const s = await t.signIn();
      t.clock.advance(31 * 86_400);
      await t.http().post("/auth/refresh").send({ refreshToken: s.refreshToken }).expect(401);
    });

    it("rejects unknown refresh tokens", async () => {
      await t.http().post("/auth/refresh").send({ refreshToken: "x".repeat(43) }).expect(401);
    });

    it("logout revokes the access and refresh tokens of that device only", async () => {
      const a = await t.signIn();
      t.clock.advance(31); // resend cooldown
      const b = await t.signIn(); // second device, same account
      await t.http().post("/auth/logout").set("authorization", a.auth).expect(200);
      await t.http().get("/customers/me").set("authorization", a.auth).expect(401);
      await t.http().post("/auth/refresh").send({ refreshToken: a.refreshToken }).expect(401);
      await t.http().get("/customers/me").set("authorization", b.auth).expect(200);
    });
  });
});
