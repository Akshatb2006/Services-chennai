# Provider integration checklist

**No provider is connected.** Each one below is explicitly unavailable in code, so nothing pretends to work:

| Capability | Current behaviour | Code boundary |
| --- | --- | --- |
| OTP SMS | `OTP_PROVIDER=none` → `POST /*/send-otp` returns 503. `console` (dev only, refused in production) prints codes to the API terminal. | `backend/src/modules/notifications/sms-sender.ts` (`SmsSender`) |
| Job-update SMS | Delivery rows recorded as `skipped` ("Transactional SMS not configured") | `SmsSender.supportsTransactional` |
| Push | Delivery rows recorded as `skipped` ("No push provider configured") | `backend/src/modules/notifications/push-sender.ts` (`PushSender`) |
| Document storage | `POST /pro/me/documents` returns 503; dashboard says "not connected" | `backend/src/modules/professionals/document-storage.ts` (`DocumentStorage`) |
| Payments | `GET /pro/me/earnings` → `{ status: "not_available" }`. No pricing anywhere. | Not started |

Vendor names below are examples to compare, not choices. No credentials are stored or invented.

**General rules for every provider:**
- Credentials go only in the deployment's secret store and `.env` (never committed).
- Add each new variable to `backend/src/config/env.ts`. Production boot must fail if a selected provider is missing its variables.

---

## 1. OTP SMS (India)

**Regulatory prerequisites:** TRAI TCCCPR, 2018 ("DLT"). These take **2–4 weeks** and must be done by the business, not the developer.

1. **Principal Entity (PE) registration** on a DLT portal (Jio, Airtel, Vi, BSNL…). Needs GST/PAN and a letter of authorisation. Output: **PE ID**.
2. **Header (sender ID).** Six characters, e.g. `HMCARE`, registered as a *Transactional / Service-Implicit* header. Output: **Header ID**.
3. **Content template**, type *Service Implicit* / OTP. Variables must use the vendor's placeholder, e.g. `{#var#}`. Suggested text:
   `{#var#} is your Homecare code. It expires in 5 minutes. Do not share it with anyone. -HOMECARE`
   Output: **Template ID**. The text sent must match the template exactly, character for character.
4. **Vendor account** with any DLT-compliant gateway, e.g. MSG91, Gupshup, Kaleyra, Twilio India or Exotel. Map the PE ID, header and template in the vendor's console.

**Credentials and environment variables** (to be added):

| Variable | Purpose |
| --- | --- |
| `OTP_PROVIDER` | Add the vendor name, e.g. `msg91` (currently `console` / `none`) |
| `SMS_API_KEY` | Vendor auth key (secret) |
| `SMS_SENDER_ID` | Registered header |
| `SMS_DLT_ENTITY_ID` | PE ID |
| `SMS_OTP_TEMPLATE_ID` | DLT template ID |
| `SMS_API_BASE_URL` | Optional regional endpoint |

**Implementation:**
- Implement `SmsSender.sendOtp(phone, code, ttlMinutes)` as a single HTTPS call.
- Throw on any non-2xx response or vendor error code. The OTP service already deletes the challenge and returns 503 so the user can retry.
- **Never log the code or the request body.**

**Retry and idempotency:**
- Don't retry automatically inside the request. The user retries (subject to the 30 s cooldown and 5 per hour cap).
- Optional: pass the challenge id as the vendor's client reference for support lookups.

**Webhooks:**
- Optional delivery reports (DLR). If used, add `POST /webhooks/sms` verified by vendor signature or IP allowlist.
- Store per-challenge delivery status only. Never store the code.

**Local testing:**
- Keep `OTP_PROVIDER=console` locally.
- Test the real vendor on a staging API with test numbers.
- Vendors usually provide sandbox or test credits.

**Activation checklist:**
- [ ] PE, header and template approved; template text matches the code exactly.
- [ ] Secrets set; `NODE_ENV=production`; the boot check passes (console provider is refused in production).
- [ ] Send to 3 operators (Jio, Airtel, Vi). Delivery under 10 s; DND numbers receive it (service implicit).
- [ ] Monitoring: alert on a send-otp 503 rate above 2%.
- [ ] Spend cap or alerts at the vendor; the API's per-number and per-IP limits are already enforced.

## 2. Job-update SMS (optional channel)

**Same DLT entity and header.** Each message needs its **own approved template**:

| Template | Example text |
| --- | --- |
| `job_assigned` | `Homecare: a professional is assigned to your {#var#} request for {#var#}. We will confirm shortly.` |
| `appointment_confirmed` | `Homecare: your {#var#} is confirmed for {#var#}.` |
| `appointment_rescheduled` | |
| `request_cancelled` | |
| `service_completed` | |

**Environment variables:** `SMS_TEMPLATE_<TYPE>_ID` for each template, and `SMS_TRANSACTIONAL_ENABLED=true`.

**Implementation:**
- Set `supportsTransactional = true` and add `sendText(phone, templateId, vars)`.
- **Send from the job queue**, not inside the request transaction:
  - Create a `ScheduledJob` per queued delivery, kind `notification_sms`, `dedupeKey = sms:<notificationId>`.
  - Reuse `JobQueue` for claiming, retry and backoff.
  - Mark `notification_deliveries.status` as `sent` or `failed` with the vendor message id.
- **Idempotency:** the dedupe key prevents a second send of the same notification. Pass the delivery id as the vendor's reference.

**Activation checklist:**
- [ ] Templates approved; customer consent wording in the app and on the website.
- [ ] Costs agreed.
- [ ] Failures visible in the dashboard (delivery badges already show `failed`).

## 3. Push notifications

**Recommended route:** Expo Push Service (fits the Expo apps). Direct FCM and APNs is the alternative.

**Prerequisites:**

| Item | Detail |
| --- | --- |
| EAS project | One per app; `projectId` in `app.json` (`extra.eas.projectId`) |
| Android | Firebase project → **FCM v1 service-account JSON**, uploaded to EAS credentials |
| iOS | Apple Developer account → **APNs key (.p8), Key ID, Team ID**, uploaded to EAS credentials |
| App packages | `expo-notifications` (and `expo-device`) in both apps; a rebuild is required |

**Backend work:**
- A `device_tokens` table: user, audience (`customer` / `professional`), Expo token, platform, `last_seen`, `revoked_at`.
- `POST /me/push-token` and `POST /pro/me/push-token`.
- **Sending:**
  - Implement `PushSender.send` using the Expo push API, with an optional `EXPO_ACCESS_TOKEN` for enhanced security.
  - Queue each delivery as a `ScheduledJob` (kind `notification_push`, `dedupeKey = push:<notificationId>`).
  - Fetch push **receipts** about 15 minutes later as a second job. On `DeviceNotRegistered`, revoke the token.
- **Environment variables:** `PUSH_PROVIDER=expo`, `EXPO_ACCESS_TOKEN` (secret).

**App work:**
- Ask for permission only after sign-in, with a pre-prompt explaining why.
- Android notification channel (`jobs`, high importance, for Pro).
- Tapping a notification opens `/jobs/[id]` (Pro) or `/requests/[id]` (customer) using `data.requestId`.

**Activation checklist:**
- [ ] Credentials in EAS; production builds made after adding `expo-notifications`.
- [ ] iOS: authorisation granted / denied / provisional cases tested; Android 13+ `POST_NOTIFICATIONS` runtime prompt tested.
- [ ] A delivery is marked `sent` only after the Expo ticket is accepted, and `failed` on a receipt error.
- [ ] Device checklist §H updated from N/A to real cases.

## 4. Verification document storage

**Recommended route:** a private, S3-compatible bucket in India, e.g. AWS S3 `ap-south-1` or another provider with an India region.

**Security requirements:**
- **Private bucket.** Block public access; server-side encryption (SSE-KMS); versioning on; access logs on.
- **Uploads go directly from the app** to a **presigned PUT URL** issued by `POST /pro/me/documents`:
  - URL valid for 5 minutes.
  - Content type limited to `image/jpeg`, `image/png`, `application/pdf`; size up to 10 MB.
  - Object key `professionals/<id>/<uuid>`.
  - The API never handles the bytes.
- **Malware scanning** before staff can view a document, e.g. a bucket event triggering a scanner. Mark the document `quarantined` until it's clean.
- **Viewing:**
  - Only roles with `professionals.verify`, through short-lived presigned GET URLs (60 s).
  - Audit every view (`document.viewed`).
  - No permanent links.
- **Retention:** delete documents N days after verification or rejection, as set by policy (DPDP Act). Keep only the verification outcome.

**Credentials and environment variables:** `DOCUMENT_STORAGE=s3`, `DOCS_BUCKET`, `DOCS_REGION`, `DOCS_KMS_KEY_ID`, plus an IAM role (preferred) or `DOCS_ACCESS_KEY_ID` / `DOCS_SECRET_ACCESS_KEY` scoped to that bucket prefix only.

**App work:**
- `expo-image-picker` and/or `expo-document-picker`, with iOS usage descriptions and Android permissions.
- Device checklist §I3–I6.

**Activation checklist:**
- [ ] Bucket policy reviewed; a public-access test fails as expected.
- [ ] Presign limits enforced server-side (type, size, key).
- [ ] Scanner wired; quarantined files can't be viewed.
- [ ] Retention job in the queue; view audit present.

## 5. Payments & payouts

**This needs a business decision first:** pricing model, who collects (Homecare or professional), commission, refunds, cancellation fees and GST invoicing. None of this exists in the product yet.

**Typical route in India:** Razorpay (or Cashfree / PayU) for collection, and RazorpayX (or Cashfree Payouts) for paying professionals.

**Credentials and environment variables:**

| Variable | Purpose |
| --- | --- |
| `PAYMENTS_PROVIDER` | e.g. `razorpay` |
| `RAZORPAY_KEY_ID` | Public key id |
| `RAZORPAY_KEY_SECRET` | Secret |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signature secret |
| `PAYOUTS_ACCOUNT_NUMBER`, `PAYOUTS_KEY_*` | Only if payouts are used |

**Design requirements:**
- **Server-side amounts only.** Create a provider *order* from a server-calculated amount stored on the request. The client never sends prices.
- **Webhooks** (`payment.captured`, `payment.failed`, `refund.processed`, payout events):
  - Verify the HMAC signature.
  - Store the raw event id with a unique constraint (idempotent processing).
  - Process through the job queue.
  - Respond 200 quickly.
- **Idempotency:**
  - One order per request attempt (`dedupe_key = order:<requestId>:<attempt>`).
  - Use payout idempotency keys.
  - Reconcile nightly against settlement reports.
- **Payouts:** professional KYC and bank account verification before the first payout. Store only provider tokens or ids, never raw account numbers, unless that's required and encrypted.
- **Earnings in the Pro app:** replace the `not_available` response with real ledger entries derived from captured payments minus commission. **Never estimates.**
- **PCI:** use the provider's checkout (hosted or SDK), so card data never touches Homecare servers (SAQ-A scope).

**Activation checklist:**
- [ ] Business rules signed off; GST invoicing decided.
- [ ] Test mode end to end: success, failure, refund, duplicate webhook delivery (handled once), out-of-order events.
- [ ] Reconciliation job and alerting.
- [ ] Live keys only in production secrets; webhooks on the production URL over HTTPS.
