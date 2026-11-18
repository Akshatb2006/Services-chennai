import { hmac, randomDigits, randomToken, safeEqualHex, sha256 } from "./crypto.js";

describe("crypto helpers", () => {
  it("generates zero-padded numeric codes of the requested length", () => {
    for (let i = 0; i < 200; i++) expect(randomDigits(6)).toMatch(/^\d{6}$/);
  });

  it("generates unguessable tokens", () => {
    const a = randomToken();
    expect(a).toMatch(/^[\w-]{43}$/);
    expect(randomToken()).not.toBe(a);
  });

  it("peppered OTP hashes differ from plain hashes and by key", () => {
    expect(hmac("k1", "+919840012345:123456")).not.toBe(sha256("+919840012345:123456"));
    expect(hmac("k1", "x")).not.toBe(hmac("k2", "x"));
  });

  it("compares digests safely", () => {
    expect(safeEqualHex(sha256("a"), sha256("a"))).toBe(true);
    expect(safeEqualHex(sha256("a"), sha256("b"))).toBe(false);
    expect(safeEqualHex(sha256("a"), "abcd")).toBe(false);
  });
});
