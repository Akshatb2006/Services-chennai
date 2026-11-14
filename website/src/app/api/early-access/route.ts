import { CONSENT_TEXT, validatePayload } from "@/lib/early-access";

/**
 * EARLY-ACCESS INTEGRATION POINT
 * ──────────────────────────────
 * Validates the registration, then forwards it to the backend configured in:
 *
 *   EARLY_ACCESS_WEBHOOK_URL     (required) e.g. your CRM / Zapier / Make / Google Apps Script / own API
 *   EARLY_ACCESS_WEBHOOK_SECRET  (optional) sent as "Authorization: Bearer <secret>"
 *
 * Forwarded JSON:
 *   { app, method, contact, platform, placement, consent: true, consentText, submittedAt }
 *
 * If no webhook is configured the endpoint returns 503 and the form shows an
 * honest "not open yet" message — registrations are NEVER reported as successful
 * unless the backend accepted them.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const result = validatePayload(body);
  if (!result.ok) {
    // Silently "accept" honeypot hits without storing them, so bots learn nothing.
    if (result.field === "spam") return Response.json({ ok: true }, { status: 202 });
    return Response.json({ error: "validation", field: result.field, message: result.message }, { status: 422 });
  }

  const webhook = process.env.EARLY_ACCESS_WEBHOOK_URL;
  if (!webhook) {
    return Response.json({ error: "not_configured", message: "Early-access registration is not open yet." }, { status: 503 });
  }

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.EARLY_ACCESS_WEBHOOK_SECRET ? { authorization: `Bearer ${process.env.EARLY_ACCESS_WEBHOOK_SECRET}` } : {}),
      },
      body: JSON.stringify({ ...result.data, consent: true, consentText: CONSENT_TEXT, submittedAt: new Date().toISOString() }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return Response.json({ error: "upstream", message: "We couldn't save your details. Please try again." }, { status: 502 });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "upstream", message: "We couldn't save your details. Please try again." }, { status: 502 });
  }
}
