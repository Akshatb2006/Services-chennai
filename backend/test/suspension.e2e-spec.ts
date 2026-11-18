import { addDays, todayInIndia } from "@homecare/contracts";
import { createTestApp, nextIp, type TestContext } from "./helpers.js";
import { customerRequest, seedProfessional, staffSession, uniquePhone } from "./admin-helpers.js";

describe("Professional suspension & booking safety", () => {
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
    await t.prisma.$executeRawUnsafe('TRUNCATE "scheduled_jobs", "operations_alerts" CASCADE');
    ops = await staffSession(t, "operations_admin", "Ops");
  });

  const post = (path: string, body: object = {}) => t.http().post(path).set("authorization", ops.auth).send(body);
  const day = (n: number) => addDays(todayInIndia(), n);

  /** Professional with a Pro app session. */
  async function proWithApp(name = "Lakshmi") {
    const pro = await seedProfessional(t, { name });
    const phone = pro.phone;
    const ip = nextIp();
    await t.http().post("/pro/auth/send-otp").set("x-forwarded-for", ip).send({ phone }).expect(200);
    const res = await t.http().post("/pro/auth/verify-otp").set("x-forwarded-for", ip).send({ phone, code: t.sms.lastCode(phone) }).expect(200);
    return { pro, auth: `Bearer ${res.body.data.accessToken}` };
  }

  async function booking(proId: string, date: string, confirm = true) {
    const c = await customerRequest(t, { phone: uniquePhone("98500") });
    await post(`/admin/requests/${c.request.id}/assign`, { professionalId: proId, date, slot: "morning" }).expect(200);
    if (confirm) await post(`/admin/requests/${c.request.id}/confirm`).expect(200);
    return c;
  }

  const suspend = (id: string, status = "suspended") => post(`/admin/professionals/${id}/account-status`, { status, reason: "Complaint under review" }).expect(201);

  it("with no bookings: suspends cleanly, raises no alerts, and blocks new assignments", async () => {
    const { pro } = await proWithApp();
    const res = (await suspend(pro.id)).body.data;
    expect(res).toMatchObject({ accountStatus: "suspended", activeAssignments: 0, affectedBookings: [], openAlerts: [] });
    expect((await t.http().get("/admin/overview").set("authorization", ops.auth)).body.data.openAlerts).toBe(0);
    const c = await customerRequest(t);
    expect((await post(`/admin/requests/${c.request.id}/assign`, { professionalId: pro.id, date: day(2), slot: "morning" }).expect(409)).body.error.code).toBe("not_eligible");
  });

  it("with one booking: flags it, blocks work, hides customer data, and needs an explicit reassignment", async () => {
    const { pro, auth: proAuth } = await proWithApp("Lakshmi");
    const c = await booking(pro.id, day(2));
    const res = (await suspend(pro.id)).body.data;
    expect(res.affectedBookings).toEqual([expect.objectContaining({ requestId: c.request.id, status: "open", kind: "professional_unavailable", date: day(2) })]);

    // Booking untouched, but visible as needing action.
    const detail = (await t.http().get(`/admin/requests/${c.request.id}`).set("authorization", ops.auth)).body.data;
    expect(detail.request.status).toBe("confirmed");
    expect(detail.alerts).toEqual([expect.objectContaining({ status: "open" })]);
    expect((await t.http().get("/admin/alerts").set("authorization", ops.auth)).body.data).toHaveLength(1);
    expect((await t.http().get("/admin/overview").set("authorization", ops.auth)).body.data.openAlerts).toBe(1);
    expect(await t.prisma.auditLog.count({ where: { action: "bookings.flagged" } })).toBe(1);

    // Neither staff nor the suspended professional can progress the job.
    expect((await post(`/admin/requests/${c.request.id}/start`).expect(409)).body.error.code).toBe("not_eligible");
    const [job] = (await t.http().get("/pro/jobs").set("authorization", proAuth)).body.data;
    expect(job).toMatchObject({ address: null, details: null, customer: null, actions: [] });

    // Explicit resolution: reassign.
    const other = await seedProfessional(t, { name: "Selvi" });
    await post(`/admin/requests/${c.request.id}/reassign`, { professionalId: other.id, date: day(2), slot: "morning", reason: "Original professional suspended" }).expect(200);
    const after = (await t.http().get(`/admin/requests/${c.request.id}`).set("authorization", ops.auth)).body.data;
    expect(after.alerts).toEqual([expect.objectContaining({ status: "resolved", resolution: "reassigned", resolvedBy: "Ops" })]);
    expect(after.request.status).toBe("assigned"); // replacement is NOT auto-confirmed
    const customerTypes = (await t.http().get("/notifications").set("authorization", c.customer.auth)).body.data.map((n: { type: string }) => n.type);
    expect(customerTypes[0]).toBe("request_assigned");
    const [old] = (await t.http().get("/pro/jobs?scope=cancelled").set("authorization", proAuth)).body.data;
    expect(old).toMatchObject({ state: "reassigned", address: null, customer: null });
    expect((await t.http().get("/admin/overview").set("authorization", ops.auth)).body.data.openAlerts).toBe(0);
  });

  it("with multiple bookings: flags each once, resolves only by explicit action, never auto-cancels", async () => {
    const { pro } = await proWithApp();
    const a = await booking(pro.id, day(2));
    const b = await booking(pro.id, day(3));
    const c = await booking(pro.id, day(4), false); // assigned, not yet confirmed

    expect((await suspend(pro.id)).body.data.affectedBookings).toHaveLength(3);
    await post(`/admin/professionals/${pro.id}/account-status`, { status: "inactive", reason: "Escalated" }).expect(201); // status change: no duplicate alerts
    expect(await t.prisma.operationsAlert.count({ where: { status: "open" } })).toBe(3);
    const statuses = await t.prisma.serviceRequest.findMany({ where: { id: { in: [a, b, c].map((x) => x.request.id) } }, select: { status: true } });
    expect(statuses.map((s) => s.status).sort()).toEqual(["assigned", "confirmed", "confirmed"]); // nothing cancelled

    expect((await post(`/admin/requests/${c.request.id}/confirm`).expect(409)).body.error.code).toBe("not_eligible");
    await post(`/admin/requests/${a.request.id}/cancel`, { reason: "Couldn't find a replacement" }).expect(200);
    await t.http().post(`/requests/${b.request.id}/cancel`).set("authorization", b.customer.auth).send({}).expect(200);
    const open = (await t.http().get("/admin/alerts").set("authorization", ops.auth)).body.data;
    expect(open.map((x: { requestId: string }) => x.requestId)).toEqual([c.request.id]);

    await post(`/admin/professionals/${pro.id}/account-status`, { status: "active", reason: "Cleared" }).expect(201);
    const resolved = (await t.http().get("/admin/alerts?status=resolved").set("authorization", ops.auth)).body.data;
    expect(resolved.map((x: { resolution: string }) => x.resolution).sort()).toEqual(["cancelled", "cancelled", "professional_reactivated"]);
    await post(`/admin/requests/${c.request.id}/confirm`).expect(200); // works again after reactivation
  });
});
