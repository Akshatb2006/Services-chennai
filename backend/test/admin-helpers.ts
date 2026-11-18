import { addDays, timeSlots, todayInIndia, type StaffRole } from "@homecare/contracts";
import { chennaiAddress, nextIp, type TestContext } from "./helpers.js";

let phoneSeq = 0;
export const uniquePhone = (prefix = "97000") => `+91${prefix}${String(10000 + phoneSeq++).slice(-5)}`;

/** A service date two days out (always bookable). */
export const DATE = () => addDays(todayInIndia(), 2);

/** Creates a staff member directly (as the bootstrap CLI would) and signs them in through the real OTP flow. */
export async function staffSession(t: TestContext, role: StaffRole, name = `${role} user`) {
  const phone = uniquePhone("96000");
  const user = await t.prisma.user.create({ data: { phone, role: "staff" } });
  const staff = await t.prisma.staffMember.create({ data: { userId: user.id, fullName: name, role } });
  const ip = nextIp();
  await t.http().post("/admin/auth/send-otp").set("x-forwarded-for", ip).send({ phone }).expect(200);
  const res = await t.http().post("/admin/auth/verify-otp").set("x-forwarded-for", ip).send({ phone, code: t.sms.lastCode(phone) }).expect(200);
  const cookie = (res.headers["set-cookie"] as unknown as string[]).find((c) => c.startsWith("hc_admin_rt="))!.split(";")[0];
  return { staff, phone, auth: `Bearer ${res.body.data.accessToken}`, cookie, body: res.body.data };
}

const allWeek = [0, 1, 2, 3, 4, 5, 6].flatMap((weekday) => timeSlots.map((slot) => ({ weekday, slot })));

/** Seeds a professional directly in the database (verification states set explicitly by each test). */
export async function seedProfessional(
  t: TestContext,
  opts: { name?: string; verified?: boolean; categories?: string[]; pincodes?: string[]; availability?: { weekday: number; slot: "morning" | "afternoon" | "evening" }[]; accountStatus?: "active" | "suspended" | "inactive"; availabilityStatus?: "available" | "unavailable" } = {},
) {
  const verified = opts.verified ?? true;
  return t.prisma.professional.create({
    data: {
      fullName: opts.name ?? `Pro ${phoneSeq}`,
      phone: uniquePhone("95000"),
      verificationStatus: verified ? "verified" : "pending",
      verifiedAt: verified ? new Date() : null,
      accountStatus: opts.accountStatus ?? "active",
      availabilityStatus: opts.availabilityStatus ?? "available",
      categories: { create: (opts.categories ?? ["cleaning"]).map((category) => ({ category })) },
      areas: { create: (opts.pincodes ?? [chennaiAddress.pincode]).map((pincode) => ({ pincode })) },
      availability: { create: opts.availability ?? allWeek },
    },
  });
}

/** A signed-in customer with a profile + address who has sent one request. */
export async function customerRequest(t: TestContext, opts: { service?: string; phone?: string; name?: string; pincode?: string; preferredTime?: string } = {}) {
  const c = await t.signIn(opts.phone ?? uniquePhone("98400"), { fullName: opts.name ?? "Asha Raman" });
  const address = (await t.http().post("/addresses").set("authorization", c.auth).send({ ...chennaiAddress, pincode: opts.pincode ?? chennaiAddress.pincode }).expect(201)).body.data;
  const request = (
    await t
      .http()
      .post("/requests")
      .set("authorization", c.auth)
      .send({ service: opts.service ?? "deep-cleaning", addressId: address.id, preferredDate: DATE(), preferredTime: opts.preferredTime ?? "morning", details: "Full 2BHK deep clean please" })
      .expect(201)
  ).body.data;
  return { customer: c, address, request };
}
