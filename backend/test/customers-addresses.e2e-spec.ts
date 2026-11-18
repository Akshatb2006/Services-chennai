import { chennaiAddress, createTestApp, type TestContext } from "./helpers.js";

describe("Customer profile and addresses", () => {
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

  describe("profile", () => {
    it("starts incomplete and completes with a name", async () => {
      const s = await t.signIn();
      const me = await t.http().get("/customers/me").set("authorization", s.auth).expect(200);
      expect(me.body.data).toMatchObject({ phone: "+919840012345", fullName: null, profileComplete: false });

      const updated = await t.http().patch("/customers/me").set("authorization", s.auth).send({ fullName: "  Asha Raman ", email: "asha@example.com" }).expect(200);
      expect(updated.body.data).toMatchObject({ fullName: "Asha Raman", email: "asha@example.com", profileComplete: true });
    });

    it("clears the email with an empty string", async () => {
      const s = await t.signIn();
      await t.http().patch("/customers/me").set("authorization", s.auth).send({ fullName: "Asha", email: "asha@example.com" }).expect(200);
      const res = await t.http().patch("/customers/me").set("authorization", s.auth).send({ email: "" }).expect(200);
      expect(res.body.data.email).toBeNull();
    });

    it("never changes the phone number through the profile", async () => {
      const s = await t.signIn();
      const res = await t.http().patch("/customers/me").set("authorization", s.auth).send({ fullName: "Asha", phone: "+919999999999" }).expect(200);
      expect(res.body.data.phone).toBe("+919840012345");
    });

    it("validates profile fields", async () => {
      const s = await t.signIn();
      const res = await t.http().patch("/customers/me").set("authorization", s.auth).send({ fullName: "A", email: "nope" }).expect(422);
      expect(Object.keys(res.body.error.fields).sort()).toEqual(["email", "fullName"]);
    });
  });

  describe("addresses", () => {
    it("adds, lists, edits and deletes addresses; the first is the default", async () => {
      const s = await t.signIn();
      const a = (await t.http().post("/addresses").set("authorization", s.auth).send(chennaiAddress).expect(201)).body.data;
      expect(a).toMatchObject({ ...chennaiAddress, isDefault: true, latitude: null });
      const b = (await t.http().post("/addresses").set("authorization", s.auth).send({ ...chennaiAddress, label: "work", line1: "4 Office Road" }).expect(201)).body.data;
      expect(b.isDefault).toBe(false);

      const edited = await t.http().patch(`/addresses/${b.id}`).set("authorization", s.auth).send({ landmark: "Opposite the bank" }).expect(200);
      expect(edited.body.data.landmark).toBe("Opposite the bank");

      const list = (await t.http().get("/addresses").set("authorization", s.auth).expect(200)).body.data;
      expect(list.map((x: { id: string }) => x.id)).toEqual([a.id, b.id]);

      await t.http().delete(`/addresses/${b.id}`).set("authorization", s.auth).expect(200);
      expect((await t.http().get("/addresses").set("authorization", s.auth)).body.data).toHaveLength(1);
    });

    it("keeps exactly one default when switching and when the default is deleted", async () => {
      const s = await t.signIn();
      const a = (await t.http().post("/addresses").set("authorization", s.auth).send(chennaiAddress)).body.data;
      const b = (await t.http().post("/addresses").set("authorization", s.auth).send({ ...chennaiAddress, label: "work" })).body.data;
      await t.http().patch(`/addresses/${b.id}`).set("authorization", s.auth).send({ isDefault: true }).expect(200);
      let list = (await t.http().get("/addresses").set("authorization", s.auth)).body.data;
      expect(list.filter((x: { isDefault: boolean }) => x.isDefault).map((x: { id: string }) => x.id)).toEqual([b.id]);

      await t.http().delete(`/addresses/${b.id}`).set("authorization", s.auth).expect(200);
      list = (await t.http().get("/addresses").set("authorization", s.auth)).body.data;
      expect(list).toEqual([expect.objectContaining({ id: a.id, isDefault: true })]);
    });

    it("accepts coordinates only as a pair", async () => {
      const s = await t.signIn();
      await t.http().post("/addresses").set("authorization", s.auth).send({ ...chennaiAddress, latitude: 13.04 }).expect(422);
      const ok = await t.http().post("/addresses").set("authorization", s.auth).send({ ...chennaiAddress, latitude: 13.04, longitude: 80.23 }).expect(201);
      expect(ok.body.data).toMatchObject({ latitude: 13.04, longitude: 80.23 });
    });

    it("rejects cities outside Chennai and bad pincodes", async () => {
      const s = await t.signIn();
      const res = await t.http().post("/addresses").set("authorization", s.auth).send({ ...chennaiAddress, city: "Mumbai", state: "Maharashtra", pincode: "4000" }).expect(422);
      expect(Object.keys(res.body.error.fields).sort()).toEqual(["city", "pincode", "state"]);
    });

    it("treats another customer's address as not found for every operation", async () => {
      const owner = await t.signIn("+919840000001");
      const other = await t.signIn("+919840000002");
      const a = (await t.http().post("/addresses").set("authorization", owner.auth).send(chennaiAddress)).body.data;

      expect((await t.http().get("/addresses").set("authorization", other.auth)).body.data).toEqual([]);
      const edit = await t.http().patch(`/addresses/${a.id}`).set("authorization", other.auth).send({ line1: "Hijacked street 1" }).expect(404);
      expect(edit.body.error.code).toBe("not_found");
      await t.http().patch(`/addresses/${a.id}`).set("authorization", other.auth).send({ isDefault: true }).expect(404);
      await t.http().delete(`/addresses/${a.id}`).set("authorization", other.auth).expect(404);

      const still = (await t.http().get("/addresses").set("authorization", owner.auth)).body.data;
      expect(still).toEqual([expect.objectContaining({ id: a.id, line1: chennaiAddress.line1 })]);
    });

    it("validates address ids", async () => {
      const s = await t.signIn();
      await t.http().delete("/addresses/not-a-uuid").set("authorization", s.auth).expect(422);
    });
  });
});
