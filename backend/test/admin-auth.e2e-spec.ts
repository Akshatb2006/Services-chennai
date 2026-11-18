import { createTestApp, nextIp, type TestContext } from "./helpers.js";
import { customerRequest, seedProfessional, staffSession, uniquePhone } from "./admin-helpers.js";

describe("Admin authentication & RBAC", () => {
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

  describe("staff sign-in", () => {
    it("signs staff in with an OTP, returns permissions and sets an httpOnly refresh cookie", async () => {
      const s = await staffSession(t, "operations_admin", "Priya");
      expect(s.body.staff).toMatchObject({ fullName: "Priya", role: "operations_admin", status: "active" });
      expect(s.body.staff.permissions).toContain("requests.assign");
      expect(s.body.staff.permissions).not.toContain("staff.manage");
      expect(s.body).not.toHaveProperty("refreshToken");
      const me = await t.http().get("/admin/auth/me").set("authorization", s.auth).expect(200);
      expect(me.body.data.id).toBe(s.staff.id);
      const audit = await t.prisma.auditLog.findMany({ where: { action: "staff.signed_in" } });
      expect(audit).toHaveLength(1);
    });

    it("treats non-staff numbers identically but never sends them a code", async () => {
      const phone = uniquePhone();
      const res = await t.http().post("/admin/auth/send-otp").set("x-forwarded-for", nextIp()).send({ phone }).expect(200);
      expect(res.body.data).toEqual({ expiresInSeconds: 300, resendAfterSeconds: 30 });
      expect(t.sms.sent).toHaveLength(0);
      const verify = await t.http().post("/admin/auth/verify-otp").set("x-forwarded-for", nextIp()).send({ phone, code: "123456" }).expect(400);
      expect(verify.body.error.code).toBe("otp_invalid");
    });

    it("never accepts a customer sign-in code for a staff session", async () => {
      const s = await staffSession(t, "support_staff");
      t.clock.advance(31);
      await t.http().post("/auth/send-otp").set("x-forwarded-for", nextIp()).send({ phone: s.phone }).expect(200);
      const customerCode = t.sms.lastCode(s.phone);
      await t.http().post("/admin/auth/verify-otp").set("x-forwarded-for", nextIp()).send({ phone: s.phone, code: customerCode }).expect(400);
    });

    it("refreshes via the cookie only with the admin header, rotating the cookie", async () => {
      const s = await staffSession(t, "operations_staff");
      await t.http().post("/admin/auth/refresh").set("Cookie", s.cookie).expect(403); // no CSRF header
      const res = await t.http().post("/admin/auth/refresh").set("Cookie", s.cookie).set("x-homecare-admin", "1").expect(200);
      expect(res.body.data.accessToken).toEqual(expect.any(String));
      const rotated = (res.headers["set-cookie"] as unknown as string[])[0].split(";")[0];
      expect(rotated).not.toBe(s.cookie);
      // Replaying the old cookie revokes the session.
      await t.http().post("/admin/auth/refresh").set("Cookie", s.cookie).set("x-homecare-admin", "1").expect(401);
      await t.http().post("/admin/auth/refresh").set("Cookie", rotated).set("x-homecare-admin", "1").expect(401);
    });

    it("logout revokes the staff session", async () => {
      const s = await staffSession(t, "operations_staff");
      await t.http().post("/admin/auth/logout").set("authorization", s.auth).expect(200);
      await t.http().get("/admin/auth/me").set("authorization", s.auth).expect(401);
      await t.http().post("/admin/auth/refresh").set("Cookie", s.cookie).set("x-homecare-admin", "1").expect(401);
    });

    it("disabling a staff member ends their access immediately", async () => {
      const admin = await staffSession(t, "super_admin");
      const ops = await staffSession(t, "operations_staff");
      await t.http().get("/admin/requests").set("authorization", ops.auth).expect(200);
      await t.http().patch(`/admin/staff/${ops.staff.id}`).set("authorization", admin.auth).send({ status: "disabled" }).expect(200);
      await t.http().get("/admin/requests").set("authorization", ops.auth).expect(401);
    });

    it("keeps customer and staff tokens apart", async () => {
      const { customer } = await customerRequest(t);
      const s = await staffSession(t, "super_admin");
      expect((await t.http().get("/admin/overview").set("authorization", customer.auth).expect(401)).body.error.code).toBe("session_expired");
      await t.http().get("/admin/overview").expect(401);
      await t.http().get("/customers/me").set("authorization", s.auth).expect(401);
    });
  });

  describe("role permissions (enforced by the API)", () => {
    it("support staff can read and cancel but not assign, verify or see the audit log", async () => {
      const s = await staffSession(t, "support_staff");
      const { request } = await customerRequest(t);
      const pro = await seedProfessional(t);
      await t.http().get("/admin/requests").set("authorization", s.auth).expect(200);
      const detail = await t.http().get(`/admin/requests/${request.id}`).set("authorization", s.auth).expect(200);
      expect(detail.body.data.allowedActions).toEqual(["cancel"]);
      const assign = await t.http().post(`/admin/requests/${request.id}/assign`).set("authorization", s.auth).send({ professionalId: pro.id, date: request.preferredDate, slot: "morning" }).expect(403);
      expect(assign.body.error.code).toBe("forbidden");
      await t.http().post(`/admin/professionals/${pro.id}/verification`).set("authorization", s.auth).send({ status: "rejected" }).expect(403);
      await t.http().get("/admin/audit").set("authorization", s.auth).expect(403);
      await t.http().post("/admin/professionals").set("authorization", s.auth).send({}).expect(403);
    });

    it("operations staff can assign and confirm but not verify, suspend, change services or read the audit log", async () => {
      const s = await staffSession(t, "operations_staff");
      const pro = await seedProfessional(t, { verified: false });
      const detailActions = (await t.http().get(`/admin/requests/${(await customerRequest(t)).request.id}`).set("authorization", s.auth)).body.data.allowedActions;
      expect(detailActions).toEqual(["assign"]);
      await t.http().post(`/admin/professionals/${pro.id}/verification`).set("authorization", s.auth).send({ status: "verified" }).expect(403);
      await t.http().post(`/admin/professionals/${pro.id}/account-status`).set("authorization", s.auth).send({ status: "suspended", reason: "test" }).expect(403);
      await t.http().patch("/admin/services/laundry").set("authorization", s.auth).send({ enabled: false }).expect(403);
      await t.http().get("/admin/audit").set("authorization", s.auth).expect(403);
    });

    it("only super admins manage staff", async () => {
      const ops = await staffSession(t, "operations_admin");
      await t.http().get("/admin/staff").set("authorization", ops.auth).expect(403);
      const sa = await staffSession(t, "super_admin");
      const created = await t.http().post("/admin/staff").set("authorization", sa.auth).send({ fullName: "New Agent", phone: "9876500001", role: "support_staff" }).expect(201);
      expect(created.body.data).toMatchObject({ role: "support_staff", phone: "+919876500001" });
      await t.http().patch(`/admin/staff/${sa.staff.id}`).set("authorization", sa.auth).send({ role: "support_staff" }).expect(403); // can't demote yourself
    });
  });
});
