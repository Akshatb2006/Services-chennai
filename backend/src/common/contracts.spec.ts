import { addDays, canCustomerCancel, maskPhone, normaliseIndianMobile, requestStatuses, verifyOtpSchema } from "@homecare/contracts";

describe("phone normalisation", () => {
  it.each([
    ["9840012345", "+919840012345"],
    ["98400 12345", "+919840012345"],
    ["+91 98400-12345", "+919840012345"],
    ["919840012345", "+919840012345"],
    ["09840012345", "+919840012345"],
    ["(984) 001-2345", "+919840012345"],
    ["6000000000", "+916000000000"],
  ])("%s → %s", (input, expected) => {
    expect(normaliseIndianMobile(input)).toBe(expected);
  });

  it.each(["5840012345", "984001234", "98400123456", "+1 9840012345", "+44 9840012345", "phone", "", "+91"])("rejects %j", (input) => {
    expect(normaliseIndianMobile(input)).toBeNull();
  });

  it("masks numbers for logs", () => {
    expect(maskPhone("+919840012345")).toBe("+91 ••••• •2345");
  });
});

describe("contract schemas", () => {
  it("normalises the phone in verify-otp and requires 6 digits", () => {
    expect(verifyOtpSchema.parse({ phone: "98400 12345", code: " 123456 " })).toEqual({ phone: "+919840012345", code: "123456" });
    expect(verifyOtpSchema.safeParse({ phone: "9840012345", code: "12345" }).success).toBe(false);
  });

  it("allows customer cancellation until the work starts", () => {
    expect(requestStatuses.filter(canCustomerCancel)).toEqual(["pending", "assigned", "confirmed"]);
  });

  it("adds calendar days", () => {
    expect(addDays("2026-02-27", 2)).toBe("2026-03-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});
