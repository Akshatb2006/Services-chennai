import { addDays, todayInIndia } from "@homecare/contracts";
import { chennaiAddress, createTestApp, type TestContext } from "./helpers.js";

describe("Service requests", () => {
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

  async function customerWithAddress(phone = "+919840012345") {
    const s = await t.signIn(phone, { fullName: "Asha" });
    const address = (await t.http().post("/addresses").set("authorization", s.auth).send(chennaiAddress).expect(201)).body.data;
    return { ...s, address };
  }
  const body = (addressId: string, extra: Record<string, unknown> = {}) => ({
    service: "deep-cleaning",
    addressId,
    preferredDate: addDays(todayInIndia(), 2),
    preferredTime: "morning",
    details: "2BHK deep clean, kitchen needs extra attention",
    ...extra,
  });

  it("creates a pending (not confirmed) request with history, an address snapshot and a notification", async () => {
    const c = await customerWithAddress();
    const res = await t.http().post("/requests").set("authorization", c.auth).send(body(c.address.id)).expect(201);
    const r = res.body.data;
    expect(r).toMatchObject({ service: "deep-cleaning", status: "pending", canCancel: true, preferredTime: "morning", addressId: c.address.id });
    expect(r.address).toMatchObject({ line1: chennaiAddress.line1, pincode: "600020" });

    const history = (await t.http().get(`/requests/${r.id}/history`).set("authorization", c.auth).expect(200)).body.data;
    expect(history).toEqual([expect.objectContaining({ fromStatus: null, toStatus: "pending", actor: "customer" })]);

    const notes = (await t.http().get("/notifications").set("authorization", c.auth)).body.data;
    expect(notes[0]).toMatchObject({ type: "request_received", requestId: r.id });
    expect(notes[0].body).toMatch(/isn't confirmed yet/);
  });

  it("keeps the request's address after the saved address is edited or deleted", async () => {
    const c = await customerWithAddress();
    const r = (await t.http().post("/requests").set("authorization", c.auth).send(body(c.address.id))).body.data;
    await t.http().patch(`/addresses/${c.address.id}`).set("authorization", c.auth).send({ line1: "99 New Street" }).expect(200);
    await t.http().delete(`/addresses/${c.address.id}`).set("authorization", c.auth).expect(200);
    const after = (await t.http().get(`/requests/${r.id}`).set("authorization", c.auth).expect(200)).body.data;
    expect(after.address.line1).toBe(chennaiAddress.line1);
    expect(after.addressId).toBeNull();
  });

  it("rejects unknown service identifiers", async () => {
    const c = await customerWithAddress();
    const res = await t.http().post("/requests").set("authorization", c.auth).send(body(c.address.id, { service: "pest-control" })).expect(422);
    expect(res.body.error.code).toBe("invalid_service");
    expect(await t.prisma.serviceRequest.count()).toBe(0);
  });

  it("rejects another customer's address", async () => {
    const owner = await customerWithAddress("+919840000001");
    const other = await customerWithAddress("+919840000002");
    const res = await t.http().post("/requests").set("authorization", other.auth).send(body(owner.address.id)).expect(404);
    expect(res.body.error.code).toBe("not_found");
  });

  it("requires a complete profile", async () => {
    const s = await t.signIn();
    const address = (await t.http().post("/addresses").set("authorization", s.auth).send(chennaiAddress)).body.data;
    const res = await t.http().post("/requests").set("authorization", s.auth).send(body(address.id)).expect(409);
    expect(res.body.error.code).toBe("profile_incomplete");
  });

  it.each([
    ["a past date", { preferredDate: addDays(todayInIndia(), -1) }, "preferredDate"],
    ["a date too far ahead", { preferredDate: addDays(todayInIndia(), 31) }, "preferredDate"],
    ["an invalid date", { preferredDate: "2026-02-30" }, "preferredDate"],
    ["an unknown time slot", { preferredTime: "midnight" }, "preferredTime"],
    ["too-short details", { details: "help" }, "details"],
  ])("validates %s", async (_label, extra, field) => {
    const c = await customerWithAddress();
    const res = await t.http().post("/requests").set("authorization", c.auth).send(body(c.address.id, extra)).expect(422);
    expect(res.body.error.fields[field]).toBeDefined();
  });

  it("lists my requests newest first with cursor pagination and status filter", async () => {
    const c = await customerWithAddress();
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      ids.push((await t.http().post("/requests").set("authorization", c.auth).send(body(c.address.id))).body.data.id);
      t.clock.advance(1);
    }
    const page1 = (await t.http().get("/requests?limit=2").set("authorization", c.auth).expect(200)).body.data;
    expect(page1.items.map((r: { id: string }) => r.id)).toEqual([ids[2], ids[1]]);
    const page2 = (await t.http().get(`/requests?limit=2&cursor=${page1.nextCursor}`).set("authorization", c.auth).expect(200)).body.data;
    expect(page2).toEqual({ items: [expect.objectContaining({ id: ids[0] })], nextCursor: null });

    await t.http().post(`/requests/${ids[0]}/cancel`).set("authorization", c.auth).send({}).expect(200);
    const cancelled = (await t.http().get("/requests?status=cancelled").set("authorization", c.auth)).body.data;
    expect(cancelled.items.map((r: { id: string }) => r.id)).toEqual([ids[0]]);
  });

  it("hides other customers' requests", async () => {
    const owner = await customerWithAddress("+919840000001");
    const other = await customerWithAddress("+919840000002");
    const r = (await t.http().post("/requests").set("authorization", owner.auth).send(body(owner.address.id))).body.data;
    expect((await t.http().get("/requests").set("authorization", other.auth)).body.data.items).toEqual([]);
    await t.http().get(`/requests/${r.id}`).set("authorization", other.auth).expect(404);
    await t.http().get(`/requests/${r.id}/history`).set("authorization", other.auth).expect(404);
    await t.http().post(`/requests/${r.id}/cancel`).set("authorization", other.auth).send({}).expect(404);
    expect((await t.prisma.serviceRequest.findUniqueOrThrow({ where: { id: r.id } })).status).toBe("pending");
  });

  describe("cancellation", () => {
    it("cancels a pending request and records who and why", async () => {
      const c = await customerWithAddress();
      const r = (await t.http().post("/requests").set("authorization", c.auth).send(body(c.address.id))).body.data;
      const res = await t.http().post(`/requests/${r.id}/cancel`).set("authorization", c.auth).send({ reason: "Plans changed" }).expect(200);
      expect(res.body.data).toMatchObject({ status: "cancelled", canCancel: false, cancelReason: "Plans changed" });
      const history = (await t.http().get(`/requests/${r.id}/history`).set("authorization", c.auth)).body.data;
      expect(history.map((e: { toStatus: string }) => e.toStatus)).toEqual(["pending", "cancelled"]);
      expect(history[1]).toMatchObject({ fromStatus: "pending", actor: "customer", note: "Plans changed" });
    });

    it.each(["assigned", "confirmed"] as const)("allows cancelling a %s request", async (status) => {
      const c = await customerWithAddress();
      const r = (await t.http().post("/requests").set("authorization", c.auth).send(body(c.address.id))).body.data;
      await t.prisma.serviceRequest.update({ where: { id: r.id }, data: { status } });
      await t.http().post(`/requests/${r.id}/cancel`).set("authorization", c.auth).send({}).expect(200);
    });

    it.each(["in_progress", "completed", "cancelled"] as const)("refuses to cancel a %s request", async (status) => {
      const c = await customerWithAddress();
      const r = (await t.http().post("/requests").set("authorization", c.auth).send(body(c.address.id))).body.data;
      await t.prisma.serviceRequest.update({ where: { id: r.id }, data: { status } });
      const before = (await t.http().get(`/requests/${r.id}`).set("authorization", c.auth)).body.data;
      expect(before.canCancel).toBe(false);
      const res = await t.http().post(`/requests/${r.id}/cancel`).set("authorization", c.auth).send({}).expect(409);
      expect(res.body.error.code).toBe("request_not_cancellable");
      expect((await t.prisma.serviceRequest.findUniqueOrThrow({ where: { id: r.id } })).status).toBe(status);
    });
  });

  it("serves the shared catalogue", async () => {
    const list = (await t.http().get("/services").expect(200)).body.data;
    expect(list.services).toHaveLength(13);
    expect(list.categories).toHaveLength(5);
    await t.http().get("/services/deep-cleaning").expect(200);
    await t.http().get("/services/pest-control").expect(404);
  });

  it("rejects customer tokens on admin routes", async () => {
    const c = await customerWithAddress();
    const res = await t.http().get("/admin/requests").set("authorization", c.auth).expect(401);
    expect(res.body.error.code).toBe("session_expired");
  });
});
