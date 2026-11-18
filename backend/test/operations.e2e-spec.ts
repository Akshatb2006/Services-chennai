import { addDays, todayInIndia } from "@homecare/contracts";
import { createTestApp, type TestContext } from "./helpers.js";
import { customerRequest, DATE, seedProfessional, staffSession } from "./admin-helpers.js";

describe("Operations: professionals, eligibility, assignment workflow", () => {
  let t: TestContext;
  let ops: Awaited<ReturnType<typeof staffSession>>;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.app.close();
  });
  beforeEach(async () => {
    await t.reset();
    ops = await staffSession(t, "operations_admin", "Ops Admin");
  });

  const post = (path: string, body: object = {}) => t.http().post(path).set("authorization", ops.auth).send(body);
  const detail = async (id: string) => (await t.http().get(`/admin/requests/${id}`).set("authorization", ops.auth).expect(200)).body.data;

  describe("professionals", () => {
    const valid = { fullName: "Lakshmi Devi", phone: "9123400001", categories: ["cleaning"], pincodes: ["600020"], availability: [{ weekday: 1, slot: "morning" }] };

    it("registers professionals as pending verification, whatever the request says", async () => {
      const res = await post("/admin/professionals", { ...valid, verificationStatus: "verified" }).expect(201);
      expect(res.body.data).toMatchObject({ verificationStatus: "pending", accountStatus: "active", availabilityStatus: "available", categories: ["cleaning"], pincodes: ["600020"] });
      expect(res.body.data.documents).toEqual({ configured: false, count: 0 });
    });

    it("validates categories against the catalogue and rejects duplicate phones", async () => {
      await post("/admin/professionals", { ...valid, categories: ["pest-control"] }).expect(422);
      await post("/admin/professionals", valid).expect(201);
      await post("/admin/professionals", valid).expect(409);
    });

    it("verifies, rejects and suspends with audit entries", async () => {
      const p = (await post("/admin/professionals", valid)).body.data;
      const v = await post(`/admin/professionals/${p.id}/verification`, { status: "verified" }).expect(201);
      expect(v.body.data.verifiedAt).toEqual(expect.any(String));
      await post(`/admin/professionals/${p.id}/verification`, { status: "verified" }).expect(409);
      const s = await post(`/admin/professionals/${p.id}/account-status`, { status: "suspended", reason: "Complaint under review" }).expect(201);
      expect(s.body.data).toMatchObject({ accountStatus: "suspended", activeAssignments: 0 });
      const actions = (await t.prisma.auditLog.findMany({ where: { resourceId: p.id }, orderBy: { createdAt: "asc" } })).map((a) => a.action);
      expect(actions).toEqual(["professional.created", "professional.verified", "professional.suspended"]);
    });

    it("filters the professional list", async () => {
      await seedProfessional(t, { name: "Anbu", categories: ["maintenance"], pincodes: ["600017"] });
      await seedProfessional(t, { name: "Bala", verified: false });
      const byCat = (await t.http().get("/admin/professionals?category=maintenance").set("authorization", ops.auth)).body.data;
      expect(byCat.items.map((p: { fullName: string }) => p.fullName)).toEqual(["Anbu"]);
      const pending = (await t.http().get("/admin/professionals?verificationStatus=pending").set("authorization", ops.auth)).body.data;
      expect(pending.items.map((p: { fullName: string }) => p.fullName)).toEqual(["Bala"]);
      expect((await t.http().get("/admin/professionals?q=anb").set("authorization", ops.auth)).body.data.total).toBe(1);
    });
  });

  describe("eligibility", () => {
    it("lists only eligible professionals, with reasons for the rest", async () => {
      const { request } = await customerRequest(t); // deep-cleaning (cleaning) at 600020, morning
      const good = await seedProfessional(t, { name: "A Eligible" });
      await seedProfessional(t, { name: "B Unverified", verified: false });
      await seedProfessional(t, { name: "C Wrong category", categories: ["laundry"] });
      await seedProfessional(t, { name: "D Wrong area", pincodes: ["600001"] });
      await seedProfessional(t, { name: "E Evenings only", availability: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, slot: "evening" as const })) });
      await seedProfessional(t, { name: "F Suspended", accountStatus: "suspended" });
      await seedProfessional(t, { name: "G Unavailable", availabilityStatus: "unavailable" });

      const only = (await t.http().get(`/admin/requests/${request.id}/eligible-professionals`).set("authorization", ops.auth).expect(200)).body.data;
      expect(only).toMatchObject({ category: "cleaning", pincode: "600020", slot: "morning", date: request.preferredDate });
      expect(only.candidates.map((c: { professional: { id: string } }) => c.professional.id)).toEqual([good.id]);

      const all = (await t.http().get(`/admin/requests/${request.id}/eligible-professionals?includeIneligible=true`).set("authorization", ops.auth)).body.data;
      const reasons = Object.fromEntries(all.candidates.map((c: { professional: { fullName: string }; reasons: string[] }) => [c.professional.fullName, c.reasons]));
      expect(reasons).toMatchObject({
        "A Eligible": [],
        "B Unverified": ["not_verified"],
        "C Wrong category": ["category_mismatch"],
        "D Wrong area": ["area_mismatch"],
        "E Evenings only": ["not_working_that_slot"],
        "F Suspended": ["not_active"],
        "G Unavailable": ["unavailable"],
      });
    });

    it.each([
      ["unverified", { verified: false }, "not_verified"],
      ["wrong category", { categories: ["laundry"] }, "category_mismatch"],
      ["wrong area", { pincodes: ["600001"] }, "area_mismatch"],
      ["not working that slot", { availability: [] }, "not_working_that_slot"],
    ])("refuses to assign a professional who is %s", async (_l, opts, reason) => {
      const { request } = await customerRequest(t);
      const pro = await seedProfessional(t, opts as Parameters<typeof seedProfessional>[1]);
      const res = await post(`/admin/requests/${request.id}/assign`, { professionalId: pro.id, date: DATE(), slot: "morning" }).expect(409);
      expect(res.body.error.code).toBe("not_eligible");
      expect(res.body.error.message).toContain(reason);
      expect(await t.prisma.assignment.count()).toBe(0);
      expect((await detail(request.id)).request.status).toBe("pending");
    });
  });

  describe("assignment workflow", () => {
    it("assigns (without confirming), notifies honestly and audits", async () => {
      const { request, customer } = await customerRequest(t);
      const pro = await seedProfessional(t, { name: "Meena Kumari" });
      const d = (await post(`/admin/requests/${request.id}/assign`, { professionalId: pro.id, date: DATE(), slot: "afternoon" }).expect(200)).body.data;
      expect(d.request.status).toBe("assigned");
      expect(d.allowedActions).toEqual(["reassign", "confirm", "reschedule", "cancel"]);
      expect(d.assignments).toEqual([expect.objectContaining({ status: "active", slot: "afternoon", date: DATE(), assignedBy: "Ops Admin" })]);
      expect(d.events.map((e: { toStatus: string }) => e.toStatus)).toEqual(["pending", "assigned"]);
      expect(d.events[1]).toMatchObject({ actor: "staff", actorName: "Ops Admin", fromStatus: "pending" });

      const n = d.notifications.find((x: { type: string }) => x.type === "request_assigned");
      expect(n.deliveries).toEqual([
        expect.objectContaining({ channel: "in_app", status: "available" }),
        expect.objectContaining({ channel: "push", status: "skipped" }),
        expect.objectContaining({ channel: "sms", status: "skipped" }),
      ]);

      // Customer sees the appointment, not yet confirmed, and the notification history.
      const mine = (await t.http().get(`/requests/${request.id}`).set("authorization", customer.auth)).body.data;
      expect(mine).toMatchObject({ status: "assigned", appointment: { date: DATE(), slot: "afternoon", professionalFirstName: "Meena", confirmed: false } });
      const notes = (await t.http().get("/notifications").set("authorization", customer.auth)).body.data;
      expect(notes.map((x: { type: string }) => x.type)).toEqual(["request_assigned", "request_received"]);

      expect(await t.prisma.auditLog.count({ where: { action: "professional.assigned", resourceId: request.id } })).toBe(1);
    });

    it("prevents duplicate assignment and double booking", async () => {
      const a = await customerRequest(t);
      const b = await customerRequest(t);
      const pro = await seedProfessional(t);
      const other = await seedProfessional(t);
      await post(`/admin/requests/${a.request.id}/assign`, { professionalId: pro.id, date: DATE(), slot: "morning" }).expect(200);
      expect((await post(`/admin/requests/${a.request.id}/assign`, { professionalId: other.id, date: DATE(), slot: "morning" }).expect(409)).body.error.code).toBe("invalid_transition");
      const clash = await post(`/admin/requests/${b.request.id}/assign`, { professionalId: pro.id, date: DATE(), slot: "morning" }).expect(409);
      expect(clash.body.error.code).toBe("assignment_conflict");
      // Same professional, different slot is fine.
      await post(`/admin/requests/${b.request.id}/assign`, { professionalId: pro.id, date: DATE(), slot: "evening" }).expect(200);
    });

    it("lets exactly one of two concurrent assignments of the same request win", async () => {
      const { request } = await customerRequest(t);
      const p1 = await seedProfessional(t);
      const p2 = await seedProfessional(t);
      const results = await Promise.all([p1, p2].map((p) => post(`/admin/requests/${request.id}/assign`, { professionalId: p.id, date: DATE(), slot: "morning" })));
      expect(results.map((r) => r.status).sort((x, y) => x - y)).toEqual([200, 409]);
      expect(await t.prisma.assignment.count({ where: { requestId: request.id, status: "active" } })).toBe(1);
      expect(await t.prisma.requestEvent.count({ where: { requestId: request.id, toStatus: "assigned" } })).toBe(1);
    });

    it("never double-books a professional under concurrent assignment of different requests", async () => {
      const reqs = await Promise.all([customerRequest(t), customerRequest(t), customerRequest(t)]);
      const pro = await seedProfessional(t);
      const results = await Promise.all(reqs.map((r) => post(`/admin/requests/${r.request.id}/assign`, { professionalId: pro.id, date: DATE(), slot: "morning" })));
      expect(results.filter((r) => r.status === 200)).toHaveLength(1);
      expect(results.filter((r) => r.status === 409)).toHaveLength(2);
      expect(await t.prisma.assignment.count({ where: { professionalId: pro.id, status: "active" } })).toBe(1);
    });

    it("rejects invalid status transitions", async () => {
      const { request } = await customerRequest(t);
      const pro = await seedProfessional(t);
      expect((await post(`/admin/requests/${request.id}/confirm`).expect(409)).body.error.code).toBe("invalid_transition");
      expect((await post(`/admin/requests/${request.id}/start`).expect(409)).body.error.code).toBe("invalid_transition");
      expect((await post(`/admin/requests/${request.id}/complete`).expect(409)).body.error.code).toBe("invalid_transition");
      await post(`/admin/requests/${request.id}/assign`, { professionalId: pro.id, date: DATE(), slot: "morning" }).expect(200);
      await post(`/admin/requests/${request.id}/start`).expect(409); // must be confirmed first
      await post(`/admin/requests/${request.id}/complete`).expect(409);
      // There is no endpoint that sets an arbitrary status.
      await t.http().patch(`/admin/requests/${request.id}`).set("authorization", ops.auth).send({ status: "completed" }).expect(404);
    });

    it("confirms, starts and completes with notifications and history", async () => {
      const { request, customer } = await customerRequest(t);
      const pro = await seedProfessional(t);
      await post(`/admin/requests/${request.id}/assign`, { professionalId: pro.id, date: DATE(), slot: "morning" }).expect(200);
      const confirmed = (await post(`/admin/requests/${request.id}/confirm`).expect(200)).body.data;
      expect(confirmed.request).toMatchObject({ status: "confirmed", appointment: { confirmed: true } });
      expect(confirmed.allowedActions).toEqual(["reassign", "reschedule", "start", "cancel"]);
      await post(`/admin/requests/${request.id}/start`).expect(200);
      const done = (await post(`/admin/requests/${request.id}/complete`).expect(200)).body.data;
      expect(done.request.status).toBe("completed");
      expect(done.allowedActions).toEqual([]);
      expect(done.assignments[0].status).toBe("completed");
      expect(done.events.map((e: { toStatus: string }) => e.toStatus)).toEqual(["pending", "assigned", "confirmed", "in_progress", "completed"]);
      const types = (await t.http().get("/notifications").set("authorization", customer.auth)).body.data.map((n: { type: string }) => n.type);
      expect(types).toEqual(["service_completed", "appointment_confirmed", "request_assigned", "request_received"]);
      await post(`/admin/requests/${request.id}/cancel`, { reason: "Too late" }).expect(409);
    });

    it("reassigns a confirmed request back to assigned and frees the old slot", async () => {
      const a = await customerRequest(t);
      const b = await customerRequest(t);
      const p1 = await seedProfessional(t, { name: "First" });
      const p2 = await seedProfessional(t, { name: "Second" });
      await post(`/admin/requests/${a.request.id}/assign`, { professionalId: p1.id, date: DATE(), slot: "morning" }).expect(200);
      await post(`/admin/requests/${a.request.id}/confirm`).expect(200);
      await post(`/admin/requests/${a.request.id}/reassign`, { professionalId: p2.id, date: DATE(), slot: "morning" }).expect(422); // reason required
      const d = (await post(`/admin/requests/${a.request.id}/reassign`, { professionalId: p2.id, date: DATE(), slot: "morning", reason: "First is unwell" }).expect(200)).body.data;
      expect(d.request.status).toBe("assigned");
      expect(d.assignments.map((x: { status: string; professional: { fullName: string } }) => [x.professional.fullName, x.status])).toEqual([
        ["First", "replaced"],
        ["Second", "active"],
      ]);
      expect(d.assignments[0].endReason).toBe("First is unwell");
      // p1's morning slot is free again.
      await post(`/admin/requests/${b.request.id}/assign`, { professionalId: p1.id, date: DATE(), slot: "morning" }).expect(200);
      expect(await t.prisma.auditLog.count({ where: { action: "professional.reassigned" } })).toBe(1);
    });

    it("reschedules with a conflict check and a customer notification", async () => {
      const a = await customerRequest(t);
      const b = await customerRequest(t);
      const pro = await seedProfessional(t);
      await post(`/admin/requests/${a.request.id}/assign`, { professionalId: pro.id, date: DATE(), slot: "morning" }).expect(200);
      await post(`/admin/requests/${b.request.id}/assign`, { professionalId: pro.id, date: DATE(), slot: "evening" }).expect(200);
      expect((await post(`/admin/requests/${a.request.id}/reschedule`, { date: DATE(), slot: "evening", reason: "Customer asked" }).expect(409)).body.error.code).toBe("assignment_conflict");
      const next = addDays(DATE(), 1);
      const d = (await post(`/admin/requests/${a.request.id}/reschedule`, { date: next, slot: "afternoon", reason: "Customer asked" }).expect(200)).body.data;
      expect(d.request.appointment).toMatchObject({ date: next, slot: "afternoon" });
      expect(d.events.at(-1)).toMatchObject({ fromStatus: "assigned", toStatus: "assigned" });
      expect(d.notifications.at(-1).type).toBe("appointment_rescheduled");
      await post(`/admin/requests/${a.request.id}/reschedule`, { date: addDays(todayInIndia(), -1), slot: "morning", reason: "x x x" }).expect(422);
    });

    it("cancels on the customer's behalf and releases the professional", async () => {
      const a = await customerRequest(t);
      const b = await customerRequest(t);
      const pro = await seedProfessional(t);
      await post(`/admin/requests/${a.request.id}/assign`, { professionalId: pro.id, date: DATE(), slot: "morning" }).expect(200);
      await post(`/admin/requests/${a.request.id}/cancel`).expect(422); // reason required
      const d = (await post(`/admin/requests/${a.request.id}/cancel`, { reason: "Customer called to cancel" }).expect(200)).body.data;
      expect(d.request).toMatchObject({ status: "cancelled", cancelReason: "Customer called to cancel", appointment: null });
      expect(d.assignments[0].status).toBe("cancelled");
      await post(`/admin/requests/${b.request.id}/assign`, { professionalId: pro.id, date: DATE(), slot: "morning" }).expect(200);
    });

    it("lets a customer cancel an assigned request, releasing the professional", async () => {
      const { request, customer } = await customerRequest(t);
      const pro = await seedProfessional(t);
      await post(`/admin/requests/${request.id}/assign`, { professionalId: pro.id, date: DATE(), slot: "morning" }).expect(200);
      await t.http().post(`/requests/${request.id}/cancel`).set("authorization", customer.auth).send({ reason: "Plans changed" }).expect(200);
      expect(await t.prisma.assignment.count({ where: { professionalId: pro.id, status: "active" } })).toBe(0);
      const d = await detail(request.id);
      expect(d.events.at(-1)).toMatchObject({ toStatus: "cancelled", actor: "customer" });
    });
  });

  describe("request management", () => {
    it("filters by status, service, category, customer, phone, reference and date", async () => {
      const a = await customerRequest(t, { name: "Kavya Iyer", service: "deep-cleaning" });
      const b = await customerRequest(t, { name: "Ravi Shankar", service: "plumbing" });
      await post(`/admin/requests/${b.request.id}/cancel`, { reason: "Duplicate request" }).expect(200);
      const list = async (qs: string) => (await t.http().get(`/admin/requests?${qs}`).set("authorization", ops.auth).expect(200)).body.data.items.map((r: { id: string }) => r.id);

      expect(await list("")).toEqual([b.request.id, a.request.id]);
      expect(await list("status=cancelled")).toEqual([b.request.id]);
      expect(await list("service=deep-cleaning")).toEqual([a.request.id]);
      expect(await list("category=maintenance")).toEqual([b.request.id]);
      expect(await list("q=kavya")).toEqual([a.request.id]);
      expect(await list(`q=${a.customer.customer.id ? (await t.prisma.user.findFirstOrThrow({ where: { customer: { fullName: "Ravi Shankar" } } })).phone.slice(-6) : ""}`)).toEqual([b.request.id]);
      expect(await list(`q=%23${a.request.id.slice(0, 8)}`)).toEqual([a.request.id]);
      expect(await list(`dateField=preferred&from=${DATE()}&to=${DATE()}`)).toHaveLength(2);
      expect(await list(`dateField=preferred&from=${addDays(DATE(), 1)}`)).toEqual([]);
      const page = (await t.http().get("/admin/requests?pageSize=1&page=2").set("authorization", ops.auth)).body.data;
      expect(page).toMatchObject({ total: 2, page: 2, pageSize: 1, items: [expect.objectContaining({ id: a.request.id })] });
    });

    it("shows customer profile, addresses and history to staff", async () => {
      const { request } = await customerRequest(t, { name: "Kavya Iyer" });
      const d = await detail(request.id);
      expect(d.customer).toMatchObject({ fullName: "Kavya Iyer", requestCount: 1 });
      const customers = (await t.http().get("/admin/customers?q=kavya").set("authorization", ops.auth)).body.data;
      expect(customers.total).toBe(1);
      const c = (await t.http().get(`/admin/customers/${customers.items[0].id}`).set("authorization", ops.auth).expect(200)).body.data;
      expect(c.addresses).toHaveLength(1);
      expect(c.requests.map((r: { id: string }) => r.id)).toEqual([request.id]);
    });

    it("reports live overview numbers", async () => {
      const a = await customerRequest(t);
      await customerRequest(t, { service: "plumbing" });
      const pro = await seedProfessional(t);
      await post(`/admin/requests/${a.request.id}/assign`, { professionalId: pro.id, date: DATE(), slot: "morning" }).expect(200);
      const o = (await t.http().get("/admin/overview").set("authorization", ops.auth).expect(200)).body.data;
      expect(o.counts).toMatchObject({ pending: 1, assigned: 1, confirmed: 0, in_progress: 0, completed: 0, cancelled: 0 });
      expect(o.total).toBe(2);
      expect(o.professionals).toEqual({ verified: 1, pendingVerification: 0, activeAndAvailable: 1 });
      expect(o.recentActivity[0]).toMatchObject({ toStatus: "assigned", actorName: "Ops Admin" });
      const cleaning = (await t.http().get("/admin/overview?category=maintenance").set("authorization", ops.auth)).body.data;
      expect(cleaning.total).toBe(1);
      const future = (await t.http().get(`/admin/overview?from=${addDays(todayInIndia(), 5)}`).set("authorization", ops.auth)).body.data;
      expect(future.total).toBe(0);
    });

    it("pauses a service for new requests without touching the catalogue", async () => {
      const { customer, address } = await customerRequest(t);
      await t.http().patch("/admin/services/laundry").set("authorization", ops.auth).send({ enabled: false, reason: "No laundry staff this week" }).expect(200);
      const pub = (await t.http().get("/services")).body.data;
      expect(pub.services.map((s: { slug: string }) => s.slug)).not.toContain("laundry");
      expect(pub.services).toHaveLength(12);
      const res = await t
        .http()
        .post("/requests")
        .set("authorization", customer.auth)
        .send({ service: "laundry", addressId: address.id, preferredDate: DATE(), preferredTime: "morning", details: "Two loads of washing" })
        .expect(422);
      expect(res.body.error.code).toBe("invalid_service");
      const rows = (await t.http().get("/admin/services").set("authorization", ops.auth)).body.data;
      expect(rows.find((s: { slug: string }) => s.slug === "laundry")).toMatchObject({ enabled: false, updatedBy: "Ops Admin" });
    });
  });

  describe("audit & history integrity", () => {
    it("records actions in an append-only audit log without secrets", async () => {
      const { request } = await customerRequest(t);
      const pro = await seedProfessional(t);
      await detail(request.id); // request.reviewed
      await detail(request.id); // not duplicated
      await post(`/admin/requests/${request.id}/assign`, { professionalId: pro.id, date: DATE(), slot: "morning" }).expect(200);
      await post(`/admin/requests/${request.id}/confirm`).expect(200);
      await post(`/admin/requests/${request.id}/cancel`, { reason: "Customer moved" }).expect(200);

      const log = (await t.http().get(`/admin/audit?resourceType=request&resourceId=${request.id}`).set("authorization", ops.auth).expect(200)).body.data;
      expect(log.items.map((e: { action: string }) => e.action).reverse()).toEqual(["request.reviewed", "professional.assigned", "appointment.confirmed", "request.cancelled"]);
      expect(log.items[0].actor).toMatchObject({ name: "Ops Admin", role: "operations_admin" });
      const everything = JSON.stringify(await t.prisma.auditLog.findMany());
      expect(everything).not.toMatch(/accessToken|refreshToken|"code"/);

      await expect(t.prisma.$executeRawUnsafe(`UPDATE audit_logs SET action = 'tampered'`)).rejects.toThrow(/append-only/);
      await expect(t.prisma.$executeRawUnsafe(`DELETE FROM audit_logs`)).rejects.toThrow(/append-only/);
      await expect(t.prisma.$executeRawUnsafe(`UPDATE request_events SET note = 'tampered'`)).rejects.toThrow(/append-only/);
      // There are no audit write endpoints.
      await t.http().delete(`/admin/audit/${log.items[0].id}`).set("authorization", ops.auth).expect(404);
    });

    it("persists every customer notification with per-channel delivery state", async () => {
      const { request } = await customerRequest(t);
      const pro = await seedProfessional(t);
      await post(`/admin/requests/${request.id}/assign`, { professionalId: pro.id, date: DATE(), slot: "morning" }).expect(200);
      await post(`/admin/requests/${request.id}/confirm`).expect(200);
      const deliveries = await t.prisma.notificationDelivery.findMany({ include: { notification: true } });
      expect(new Set(deliveries.map((d) => d.notification.type))).toEqual(new Set(["request_received", "request_assigned", "appointment_confirmed"]));
      expect(deliveries.filter((d) => d.status === "sent")).toEqual([]); // nothing claims to be sent without a provider
      expect(deliveries.filter((d) => d.channel === "in_app").every((d) => d.status === "available")).toBe(true);
    });
  });
});
