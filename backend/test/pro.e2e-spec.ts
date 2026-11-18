import { addDays, todayInIndia } from "@homecare/contracts";
import { createTestApp, nextIp, type TestContext } from "./helpers.js";
import { customerRequest, DATE, seedProfessional, staffSession, uniquePhone } from "./admin-helpers.js";

const registration = { fullName: "Lakshmi Devi", categories: ["cleaning"], pincodes: ["600020"], availability: [0, 1, 2, 3, 4, 5, 6].flatMap((weekday) => ["morning", "afternoon", "evening"].map((slot) => ({ weekday, slot }))) };

describe("Homecare Pro API", () => {
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

  /** Signs in to the Pro app (and optionally registers). */
  async function pro(phone = uniquePhone("93000"), opts: { register?: boolean } = { register: true }) {
    const ip = nextIp();
    await t.http().post("/pro/auth/send-otp").set("x-forwarded-for", ip).send({ phone }).expect(200);
    const res = await t.http().post("/pro/auth/verify-otp").set("x-forwarded-for", ip).send({ phone, code: t.sms.lastCode(phone) }).expect(200);
    const auth = `Bearer ${res.body.data.accessToken}`;
    let me = res.body.data.me;
    if (opts.register && !me.professional) me = (await t.http().post("/pro/me").set("authorization", auth).send(registration).expect(201)).body.data;
    return { phone, auth, refreshToken: res.body.data.refreshToken as string, me };
  }

  /** Verifies a professional the way staff do (database), so tests stay focused on the Pro API. */
  const verify = (id: string) => t.prisma.professional.update({ where: { id }, data: { verificationStatus: "verified", verifiedAt: new Date() } });

  async function assignedJob(opts: { confirm?: boolean; date?: string } = {}) {
    const ops = await staffSession(t, "operations_admin", "Ops");
    const p = await pro();
    await verify(p.me.professional.id);
    const c = await customerRequest(t, { name: "Kavya Iyer" });
    await t.http().post(`/admin/requests/${c.request.id}/assign`).set("authorization", ops.auth).send({ professionalId: p.me.professional.id, date: opts.date ?? DATE(), slot: "morning" }).expect(200);
    if (opts.confirm) await t.http().post(`/admin/requests/${c.request.id}/confirm`).set("authorization", ops.auth).send({}).expect(200);
    const jobs = (await t.http().get("/pro/jobs").set("authorization", p.auth).expect(200)).body.data;
    return { ops, p, c, job: jobs[0] };
  }

  describe("authentication & registration", () => {
    it("signs in, then registers as pending verification (never self-verified)", async () => {
      const p = await pro(undefined, { register: false });
      expect(p.me).toMatchObject({ professional: null, documents: { storageConfigured: false, count: 0 } });
      expect((await t.http().get("/pro/jobs").set("authorization", p.auth).expect(409)).body.error.code).toBe("profile_required");
      const me = (await t.http().post("/pro/me").set("authorization", p.auth).send({ ...registration, verificationStatus: "verified", accountStatus: "active" }).expect(201)).body.data;
      expect(me.professional).toMatchObject({ fullName: "Lakshmi Devi", verificationStatus: "pending", accountStatus: "active", categories: ["cleaning"] });
      await t.http().post("/pro/me").set("authorization", p.auth).send(registration).expect(409);
      // Staff see the self-registration in the dashboard, linked to the app.
      const ops = await staffSession(t, "operations_admin");
      const detail = (await t.http().get(`/admin/professionals/${me.professional.id}`).set("authorization", ops.auth)).body.data;
      expect(detail).toMatchObject({ verificationStatus: "pending", appLinked: true });
      expect(await t.prisma.auditLog.count({ where: { action: "professional.registered", actorProfessionalId: me.professional.id } })).toBe(1);
    });

    it("links a professional registered by operations instead of creating a duplicate", async () => {
      const seeded = await seedProfessional(t, { name: "Selvi Raj" });
      const p = await pro(seeded.phone, { register: false });
      expect(p.me.professional).toMatchObject({ id: seeded.id, fullName: "Selvi Raj", verificationStatus: "verified" });
      expect(await t.prisma.professional.count()).toBe(1);
    });

    it("can't change its own verification or account status", async () => {
      const p = await pro();
      await t.http().patch("/pro/me").set("authorization", p.auth).send({ verificationStatus: "verified", accountStatus: "active" }).expect(422);
      expect((await t.prisma.professional.findUniqueOrThrow({ where: { id: p.me.professional.id } })).verificationStatus).toBe("pending");
    });

    it("keeps professional, customer and staff sessions apart", async () => {
      const p = await pro();
      const { customer } = await customerRequest(t);
      const ops = await staffSession(t, "super_admin");
      await t.http().get("/pro/me").set("authorization", customer.auth).expect(401);
      await t.http().get("/pro/me").set("authorization", ops.auth).expect(401);
      await t.http().get("/customers/me").set("authorization", p.auth).expect(401);
      await t.http().get("/admin/requests").set("authorization", p.auth).expect(401);
      // A customer sign-in code can't be used for the Pro app.
      t.clock.advance(31);
      await t.http().post("/auth/send-otp").set("x-forwarded-for", nextIp()).send({ phone: p.phone }).expect(200);
      await t.http().post("/pro/auth/verify-otp").set("x-forwarded-for", nextIp()).send({ phone: p.phone, code: t.sms.lastCode(p.phone) }).expect(400);
    });

    it("rotates refresh tokens and logs out", async () => {
      const p = await pro();
      const r = (await t.http().post("/pro/auth/refresh").send({ refreshToken: p.refreshToken }).expect(200)).body.data;
      await t.http().post("/pro/auth/refresh").send({ refreshToken: p.refreshToken }).expect(401); // replay revokes
      await t.http().post("/pro/auth/refresh").send({ refreshToken: r.refreshToken }).expect(401);
      const q = await pro(undefined, { register: false });
      await t.http().post("/pro/auth/logout").set("authorization", q.auth).expect(200);
      await t.http().get("/pro/me").set("authorization", q.auth).expect(401);
    });
  });

  describe("jobs", () => {
    it("shows a professional only their own jobs, with customer details limited until confirmed", async () => {
      const { p, c, job, ops } = await assignedJob();
      expect(job).toMatchObject({ requestId: c.request.id, service: "deep-cleaning", state: "awaiting_confirmation", date: DATE(), slot: "morning", details: "Full 2BHK deep clean please" });
      expect(job.address).toMatchObject({ pincode: "600020" });
      expect(job.customer).toEqual({ firstName: "Kavya", phone: null });
      expect(job.actions).toEqual(["acknowledge"]);
      expect(job.startBlockedReason).toMatch(/confirm the appointment/);

      const other = await pro();
      expect((await t.http().get("/pro/jobs?scope=all").set("authorization", other.auth)).body.data).toEqual([]);
      await t.http().get(`/pro/jobs/${job.id}`).set("authorization", other.auth).expect(404);
      await t.http().post(`/pro/jobs/${job.id}/acknowledge`).set("authorization", other.auth).expect(404);

      await t.http().post(`/admin/requests/${c.request.id}/confirm`).set("authorization", ops.auth).send({}).expect(200);
      const confirmed = (await t.http().get(`/pro/jobs/${job.id}`).set("authorization", p.auth)).body.data;
      expect(confirmed.state).toBe("confirmed");
      expect(confirmed.customer.phone).toMatch(/^\+91/);
    });

    it("hides details of a job that was reassigned away", async () => {
      const { p, c, ops } = await assignedJob();
      const second = await seedProfessional(t);
      await t.http().post(`/admin/requests/${c.request.id}/reassign`).set("authorization", ops.auth).send({ professionalId: second.id, date: DATE(), slot: "morning", reason: "Customer asked for another pro" }).expect(200);
      expect((await t.http().get("/pro/jobs").set("authorization", p.auth)).body.data).toEqual([]);
      const [old] = (await t.http().get("/pro/jobs?scope=cancelled").set("authorization", p.auth)).body.data;
      expect(old).toMatchObject({ state: "reassigned", details: null, address: null, customer: null, actions: [] });
    });

    it("acknowledges (informational) and records it for operations", async () => {
      const { p, c, job, ops } = await assignedJob();
      const acked = (await t.http().post(`/pro/jobs/${job.id}/acknowledge`).set("authorization", p.auth).expect(200)).body.data;
      expect(acked.acknowledgedAt).toEqual(expect.any(String));
      expect(acked.actions).toEqual([]);
      await t.http().post(`/pro/jobs/${job.id}/acknowledge`).set("authorization", p.auth).expect(200); // idempotent
      const d = (await t.http().get(`/admin/requests/${c.request.id}`).set("authorization", ops.auth)).body.data;
      expect(d.request.status).toBe("assigned"); // no status change
      expect(d.assignments[0].acknowledgedAt).toEqual(acked.acknowledgedAt);
    });

    it("starts only once confirmed and on the appointment date, then completes", async () => {
      const { p, c, job, ops } = await assignedJob();
      expect((await t.http().post(`/pro/jobs/${job.id}/start`).set("authorization", p.auth).send({}).expect(409)).body.error.code).toBe("invalid_transition");
      await t.http().post(`/pro/jobs/${job.id}/complete`).set("authorization", p.auth).send({}).expect(409);
      await t.http().post(`/admin/requests/${c.request.id}/confirm`).set("authorization", ops.auth).send({}).expect(200);
      const early = await t.http().post(`/pro/jobs/${job.id}/start`).set("authorization", p.auth).send({}).expect(403);
      expect(early.body.error.message).toMatch(/appointment date/);

      t.clock.advance(2 * 86_400);
      const started = (await t.http().post(`/pro/jobs/${job.id}/start`).set("authorization", p.auth).send({}).expect(200)).body.data;
      expect(started).toMatchObject({ state: "in_progress", actions: ["complete"] });
      const done = (await t.http().post(`/pro/jobs/${job.id}/complete`).set("authorization", p.auth).send({ note: "All rooms done" }).expect(200)).body.data;
      expect(done).toMatchObject({ state: "completed", actions: [] });

      const later = await staffSession(t, "operations_admin", "Ops later"); // the earlier staff session has expired after two days
      const d = (await t.http().get(`/admin/requests/${c.request.id}`).set("authorization", later.auth).expect(200)).body.data;
      expect(d.request.status).toBe("completed");
      expect(d.events.slice(-2)).toEqual([
        expect.objectContaining({ fromStatus: "confirmed", toStatus: "in_progress", actor: "professional", actorName: "Lakshmi Devi" }),
        expect.objectContaining({ fromStatus: "in_progress", toStatus: "completed", actor: "professional", note: "All rooms done" }),
      ]);
      expect(await t.prisma.auditLog.count({ where: { actorProfessionalId: p.me.professional.id, action: { in: ["request.started", "request.completed"] } } })).toBe(2);
      const customerNotes = (await t.http().get("/notifications").set("authorization", c.customer.auth)).body.data.map((n: { type: string }) => n.type);
      expect(customerNotes[0]).toBe("service_completed");
      await t.http().post(`/pro/jobs/${job.id}/complete`).set("authorization", p.auth).send({}).expect(409);
    });

    it("has no way to assign or confirm, and can't act on another professional's job", async () => {
      const { p, c, job } = await assignedJob({ confirm: true });
      await t.http().post(`/pro/jobs/${job.id}/confirm`).set("authorization", p.auth).send({}).expect(404);
      await t.http().post(`/admin/requests/${c.request.id}/confirm`).set("authorization", p.auth).send({}).expect(401);
      await t.http().post(`/admin/requests/${c.request.id}/assign`).set("authorization", p.auth).send({}).expect(401);
      const other = await pro();
      await verify(other.me.professional.id);
      t.clock.advance(2 * 86_400);
      await t.http().post(`/pro/jobs/${job.id}/start`).set("authorization", other.auth).send({}).expect(404);
    });

    it("blocks a suspended professional from starting work and from new assignments", async () => {
      const { p, c, job, ops } = await assignedJob({ confirm: true });
      await t.http().post(`/admin/professionals/${p.me.professional.id}/account-status`).set("authorization", ops.auth).send({ status: "suspended", reason: "Complaint under review" }).expect(201);
      const next = await customerRequest(t);
      const assign = await t.http().post(`/admin/requests/${next.request.id}/assign`).set("authorization", ops.auth).send({ professionalId: p.me.professional.id, date: addDays(todayInIndia(), 3), slot: "evening" }).expect(409);
      expect(assign.body.error.code).toBe("not_eligible");
      t.clock.advance(2 * 86_400);
      const res = await t.http().post(`/pro/jobs/${job.id}/start`).set("authorization", p.auth).send({}).expect(403);
      expect(res.body.error.message).toMatch(/isn't active/);
      expect(c.request.id).toBeTruthy();
    });
  });

  describe("availability", () => {
    it("refuses changes that would break an assigned or confirmed job, from the app and the dashboard", async () => {
      const { p, ops, job } = await assignedJob({ confirm: true });
      const withoutMorning = registration.availability.filter((a) => a.slot !== "morning");
      const res = await t.http().patch("/pro/me").set("authorization", p.auth).send({ availability: withoutMorning }).expect(409);
      expect(res.body.error.code).toBe("affects_assignments");
      expect(Object.keys(res.body.error.fields)).toEqual([job.id]);
      await t.http().patch("/pro/me").set("authorization", p.auth).send({ availabilityStatus: "unavailable" }).expect(409);
      await t.http().patch("/pro/me").set("authorization", p.auth).send({ pincodes: ["600041"] }).expect(409);
      await t.http().patch(`/admin/professionals/${p.me.professional.id}`).set("authorization", ops.auth).send({ categories: ["laundry"] }).expect(409);

      // Changes that keep every job valid are fine.
      const ok = (await t.http().patch("/pro/me").set("authorization", p.auth).send({ pincodes: ["600020", "600041"], availability: registration.availability.filter((a) => a.slot !== "evening") }).expect(200)).body.data;
      expect(ok.professional.pincodes).toEqual(["600020", "600041"]);
      expect(ok.professional.availability.some((a: { slot: string }) => a.slot === "evening")).toBe(false);
    });

    it("can go unavailable when no jobs are booked, and is then not eligible", async () => {
      const ops = await staffSession(t, "operations_admin");
      const p = await pro();
      await verify(p.me.professional.id);
      await t.http().patch("/pro/me").set("authorization", p.auth).send({ availabilityStatus: "unavailable" }).expect(200);
      const c = await customerRequest(t);
      const res = await t.http().post(`/admin/requests/${c.request.id}/assign`).set("authorization", ops.auth).send({ professionalId: p.me.professional.id, date: DATE(), slot: "morning" }).expect(409);
      expect(res.body.error.message).toMatch(/unavailable/);
    });

    it("keeps confirmed appointments safe from double booking", async () => {
      const { p, ops } = await assignedJob({ confirm: true });
      const other = await customerRequest(t);
      const res = await t.http().post(`/admin/requests/${other.request.id}/assign`).set("authorization", ops.auth).send({ professionalId: p.me.professional.id, date: DATE(), slot: "morning" }).expect(409);
      expect(res.body.error.code).toBe("assignment_conflict");
    });
  });

  describe("notifications, reminders, earnings, documents", () => {
    it("notifies the professional of assignment, confirmation, rescheduling and cancellation, separately from customer notifications", async () => {
      const { p, c, ops } = await assignedJob();
      await t.http().post(`/admin/requests/${c.request.id}/confirm`).set("authorization", ops.auth).send({}).expect(200);
      await t.http().post(`/admin/requests/${c.request.id}/reschedule`).set("authorization", ops.auth).send({ date: addDays(DATE(), 1), slot: "morning", reason: "Customer asked" }).expect(200);
      await t.http().post(`/requests/${c.request.id}/cancel`).set("authorization", c.customer.auth).send({}).expect(200);
      const types = (await t.http().get("/pro/me/notifications").set("authorization", p.auth)).body.data.map((n: { type: string }) => n.type);
      expect(types).toEqual(["job_cancelled", "job_rescheduled", "job_confirmed", "job_assigned"]);
      const delivery = await t.prisma.notificationDelivery.findMany({ where: { notification: { audience: "professional" }, channel: "push" } });
      expect(delivery.every((d) => d.status === "skipped")).toBe(true);
    });

    it("never mixes Pro notifications into the customer app for the same person", async () => {
      const { p } = await assignedJob();
      // Same phone signs in as a customer.
      t.clock.advance(31);
      const asCustomer = await t.signIn(p.phone);
      const list = (await t.http().get("/notifications").set("authorization", asCustomer.auth)).body.data;
      expect(list).toEqual([]);
    });

    it("reports earnings as unavailable and document upload as not configured", async () => {
      const p = await pro();
      expect((await t.http().get("/pro/me/earnings").set("authorization", p.auth).expect(200)).body.data).toMatchObject({ status: "not_available" });
      expect((await t.http().post("/pro/me/documents").set("authorization", p.auth).expect(503)).body.error.code).toBe("service_unavailable");
      expect((await t.http().get("/pro/me/documents").set("authorization", p.auth).expect(200)).body.data).toEqual({ storageConfigured: false, documents: [] });
    });
  });
});
