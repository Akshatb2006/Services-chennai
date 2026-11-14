/** Shared (client + server) validation for early-access registrations. */
export type ContactMethod = "email" | "phone";

export const CONSENT_TEXT =
  "I agree to receive app launch updates by email or SMS. I can opt out at any time.";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Indian mobile: optional +91 / 91 / 0 prefix, then 10 digits starting 6–9. */
export function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/[\s\-()]/g, "");
  const m = digits.match(/^(?:\+?91|0)?([6-9]\d{9})$/);
  return m ? `+91${m[1]}` : null;
}

export function classifyContact(raw: string): { method: ContactMethod; value: string } | null {
  const v = raw.trim();
  if (!v) return null;
  if (v.includes("@")) return EMAIL.test(v) && v.length <= 254 ? { method: "email", value: v.toLowerCase() } : null;
  const phone = normalisePhone(v);
  return phone ? { method: "phone", value: phone } : null;
}

export type EarlyAccessPayload = {
  app: "customer" | "professional";
  contact: string;
  platform: "ios" | "android" | "either";
  consent: boolean;
  placement?: string;
  /** Honeypot — must be empty */
  company?: string;
};

export function validatePayload(body: unknown):
  | { ok: true; data: { app: EarlyAccessPayload["app"]; method: ContactMethod; contact: string; platform: EarlyAccessPayload["platform"]; placement: string } }
  | { ok: false; field: "contact" | "consent" | "app" | "spam"; message: string } {
  const b = (body ?? {}) as Partial<EarlyAccessPayload>;
  if (b.company) return { ok: false, field: "spam", message: "Rejected." };
  if (b.app !== "customer" && b.app !== "professional") return { ok: false, field: "app", message: "Unknown app." };
  const c = classifyContact(String(b.contact ?? ""));
  if (!c) return { ok: false, field: "contact", message: "Enter a valid email or 10-digit mobile number." };
  if (b.consent !== true) return { ok: false, field: "consent", message: "Please confirm you agree to receive launch updates." };
  const platform = b.platform === "ios" || b.platform === "android" ? b.platform : "either";
  return { ok: true, data: { app: b.app, method: c.method, contact: c.value, platform, placement: String(b.placement ?? "unknown").slice(0, 40) } };
}
