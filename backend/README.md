# Homecare API

NestJS 12 · PostgreSQL 17 · Prisma 7 · Zod (via `@homecare/contracts`) · Vitest.
A modular monolith serving the customer app (phone-OTP sign-in, profiles, saved addresses, service requests) and the
operations dashboard in [`../admin`](../admin/README.md) (staff auth, request management, professionals, assignment, audit).

## Quick start (local)

```bash
cd backend
npm install
cp .env.example .env            # then set JWT_ACCESS_SECRET and OTP_PEPPER (see the file)
npm run db:up                   # Postgres 17 in Docker on localhost:5433 (+ a homecare_test database)
npm run db:deploy               # apply migrations
npm run start:dev               # http://localhost:4000
```

- Swagger UI: **http://localhost:4000/docs** (JSON: `/docs-json`). Enabled outside production by default.
- Health: `GET /health` is **readiness** (database answers within 3 s, else 503); `GET /health/live` is **liveness** (process only).

### Development OTP

With `OTP_PROVIDER=console` (development only), sign-in codes are printed in the API terminal:

```
[DEV OTP] +91 ••••• •2345 → 482913 (valid 5 min; development provider, not sent by SMS)
```

Codes never appear in API responses or the structured request log. The server refuses to start with
`OTP_PROVIDER=console` when `NODE_ENV=production`.

## Commands

| Command | What it does |
| --- | --- |
| `npm run db:up` | Start the local Postgres container (`docker-compose.yml`) |
| `npm run db:migrate` | Create/apply a migration after editing `prisma/schema.prisma` (dev) |
| `npm run db:deploy` | Apply committed migrations (CI/production) |
| `npm run db:validate` | Validate the Prisma schema |
| `npm run db:reset` | Drop and recreate the local database (destroys local data) |
| `npm run build` / `start:prod` | Generate the client, bundle with Rspack, run `dist/main.js` |
| `npm run typecheck` / `lint` | `tsc --noEmit` / oxlint (type-aware) |
| `npm test` | Unit tests (no database) |
| `npm run test:e2e` | Integration tests against the `homecare_test` database (wiped between tests) |
| `npm run check` | All of the above |
| `scripts/docker-smoke.sh [api-image] [migrate-image]` | Disposable end-to-end check of the Docker images (TLS PostgreSQL, migrations, refusals, health, SIGTERM) |

The integration tests use `TEST_DATABASE_URL` if set, otherwise `homecare_test` on the local container.

## Production image & migrations

```bash
# from the repository root (the build bundles ../catalog and ../contracts)
docker build -f backend/Dockerfile -t homecare-api:<version> .                    # runtime: node dist/main.js
docker build -f backend/Dockerfile --target migrate -t homecare-api-migrate:<version> .   # prisma migrate deploy
```

In production, startup refuses:
- a `DATABASE_URL` without verified TLS (`sslmode=verify-full`)
- the console OTP provider
- missing, short or identical secrets
- non-`https://` CORS origins

Migrations read `MIGRATION_DATABASE_URL` (falling back to `DATABASE_URL` locally), because Prisma's migration
engine spells TLS differently: `sslmode=require&sslaccept=strict`. The migrate image refuses anything weaker.

Full instructions: [`../docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md`](../docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md).

## Modules

| Module | Responsibility |
| --- | --- |
| Auth | OTP issue/verify, sessions, access + refresh tokens, global access-token guard |
| Users | Accounts (a verified phone number is the identity) |
| Customers | Profile: name, email, phone (read-only), completion state |
| Addresses | Saved addresses, one default per customer, Chennai only |
| Services | Catalogue from `@homecare/catalog` (same source as the website and app) |
| ServiceRequests | Create, list, detail, status history, customer cancellation |
| Notifications | SMS provider interface (OTP) and in-app notifications |
| Staff | Staff sign-in (OTP, separate audience), roles and permissions, staff management |
| Professionals | Professional records, categories, serviceable pincodes, weekly availability, verification, account status, document-storage interface |
| Operations | Admin request list and detail, eligibility, assign, reassign, confirm, reschedule, start, complete, cancel; overview; customers; services; audit |
| Audit | Append-only audit log (database trigger blocks UPDATE/DELETE) |
| Pro | Homecare Pro app API: professional sign-in (own audience), self-registration, profile and availability, own jobs, start and complete, notifications, reminders |

## API

All responses: `{ "data": ... }`. All errors:
`{ "error": { "code", "message", "fields"?, "retryAfterSeconds"?, "requestId"? } }`. Codes are listed in `@homecare/contracts` (`apiErrorCodes`).

| Endpoint | Auth | Notes |
| --- | --- | --- |
| `POST /auth/send-otp` | – | 5/min per IP; 30s resend cooldown and 5/hour per number |
| `POST /auth/verify-otp` | – | 10/min per IP; creates the account on first sign-in |
| `POST /auth/refresh` | – | Rotates the refresh token (single use) |
| `POST /auth/logout` | ✓ | Revokes this device's session |
| `GET/PATCH /customers/me` | ✓ | Profile; phone can't be changed here |
| `GET/POST /addresses`, `PATCH/DELETE /addresses/:id` | ✓ | Ownership enforced (404 for others' ids) |
| `GET /services`, `GET /services/:slug` | – | Catalogue |
| `POST/GET /requests`, `GET /requests/:id`, `GET /requests/:id/history`, `POST /requests/:id/cancel` | ✓ | New requests are `pending` (under review) |
| `GET /notifications`, `POST /notifications/:id/read` | ✓ | In-app notifications |
| `POST /admin/auth/send-otp`, `/verify-otp`, `/refresh`, `/logout`, `GET /admin/auth/me` | staff | Refresh token in an httpOnly cookie; refresh requires `x-homecare-admin: 1` |
| `GET /admin/overview` | `overview.read` | Live counts, review queue, recent activity |
| `GET /admin/requests`, `GET /admin/requests/:id` | `requests.read` | Search, filters, detail with history, assignments, notifications, `allowedActions` |
| `GET /admin/requests/:id/eligible-professionals` | `requests.read` | Eligible professionals for a date and slot (with reasons for those who aren't) |
| `POST /admin/requests/:id/{assign,reassign,reschedule}` | `requests.assign` | Locked transaction with an eligibility re-check |
| `POST /admin/requests/:id/confirm` | `requests.confirm` | assigned → confirmed |
| `POST /admin/requests/:id/{start,complete}` | `requests.progress` | confirmed → in_progress → completed |
| `POST /admin/requests/:id/cancel` | `requests.cancel` | Reason required; releases the professional |
| `GET/POST /admin/professionals`, `GET/PATCH /admin/professionals/:id` | `professionals.read` / `.write` | Always created as pending verification |
| `POST /admin/professionals/:id/verification` | `professionals.verify` | Verify or reject |
| `POST /admin/professionals/:id/account-status` | `professionals.status` | Suspend, deactivate or reactivate (reason required) |
| `GET /admin/customers`, `GET /admin/customers/:id` | `customers.read` | Read-only |
| `GET /admin/services`, `PATCH /admin/services/:slug` | `services.read` / `.write` | Pause or resume a catalogue service |
| `GET /admin/audit` | `audit.read` | Read-only |
| `GET /admin/alerts?status=open\|resolved` | `requests.read` | Bookings needing action after a professional becomes unavailable |
| `GET/POST /admin/staff`, `PATCH /admin/staff/:id` | `staff.manage` | Super admins only |
| `POST /pro/auth/{send-otp,verify-otp,refresh,logout}` | professional | Links an existing professional record with the same phone |
| `GET/POST/PATCH /pro/me` | professional | Register (always pending); update services, pincodes, availability. Verification and account status are not accepted |
| `GET /pro/me/notifications`, `/earnings`, `/documents` | professional | Earnings return `not_available`; document upload returns 503 until storage exists |
| `GET /pro/jobs?scope=`, `GET /pro/jobs/:id` | professional | Own assignments only (404 otherwise) |
| `POST /pro/jobs/:id/{acknowledge,start,complete}` | professional | Start needs a confirmed job on or after the appointment date; complete needs an in-progress job |

## Security model

- **OTP:** 6-digit CSPRNG codes stored only as `HMAC-SHA256(OTP_PEPPER, phone:code)`. Each code is valid for 5 minutes and up to 5 attempts, and a new code invalidates the previous one. A per-number Postgres advisory lock serialises sends and verifications. Wrong, expired, used and unknown codes all return the same `otp_invalid` response, so numbers can't be enumerated.
- **Tokens:**
  - Access tokens are HS256 JWTs (15 min) carrying the user, session and role. Every request also checks that the session hasn't been revoked, so logout takes effect immediately.
  - Refresh tokens are 256-bit opaque values stored as SHA-256 hashes, single-use and rotated on every refresh. Replaying an already-rotated token revokes the whole session.
- **Rate limits:** a global per-IP budget, tighter per-route limits on auth, and per-number OTP limits in the database. The throttler keeps its state in memory: use a shared store (e.g. Redis) or edge rate limiting before running more than one instance. Set `TRUST_PROXY` to the number of proxies in front of the API (`1` behind one load balancer). Never set it higher than the real number, or clients can spoof their IP.
- **Logging:** structured pino logs with request ids. Bodies are never logged, the `Authorization` header is redacted, and phone numbers are masked in application logs.
- **Ownership:** every customer query is scoped by `customerId`, and database constraints back the API checks (one default address, pincode format, coordinates paired, E.164 phones).

## Connecting an SMS provider (not done yet)

No paid SMS provider has been selected or integrated. Until one is configured, set `OTP_PROVIDER=none` in production: sign-in then fails honestly with 503 instead of pretending to send. To add one:

1. Implement `SmsSender` (`src/modules/notifications/sms-sender.ts`) for the provider's HTTP API.
2. Add its name to `OTP_PROVIDER` in `src/config/env.ts`, together with its credentials (e.g. API key, sender ID, template ID). Credentials go in environment variables only.
3. Register it in `smsSenderFactory`.

Requirements for sending OTP SMS in India: a TRAI **DLT** registration for the business, an approved **sender ID (header)**, and an approved **OTP content template** whose text matches what `sendOtp` sends. Most Indian SMS gateways provide these and also offer OTP-specific APIs.

## Staff access & roles

Bootstrap the first super admin on the server (no passwords, no bypass):

```bash
npm run staff:create -- --phone "98400 12345" --name "Priya Raman" --role super_admin
```

| Role | Can |
| --- | --- |
| `super_admin` | Everything, including managing staff |
| `operations_admin` | All operations: assign and confirm, verify and suspend professionals, pause services, read the audit log |
| `operations_staff` | Read; assign, reassign, reschedule, confirm, start and complete; register and edit professionals (not verify) |
| `support_staff` | Read requests, customers and professionals; cancel requests on a customer's behalf |

The role-to-permission map lives in `@homecare/contracts` (`rolePermissions`). `StaffGuard` enforces it on every admin route and denies any route that hasn't declared a permission.

**Staff sessions are kept separate from customer sessions:**
- Staff tokens carry a different JWT audience, and their sessions are marked `audience = staff`.
- Each OTP is tied to the flow that requested it, so a customer code can't open a staff session.
- A number that isn't staff gets the same response but never receives a code.

## Request workflow

```
pending (under review) ──assign──▶ assigned ──confirm──▶ confirmed ──start──▶ in_progress ──complete──▶ completed
     │                               │   ▲ reassign / reschedule   │  reassign (back to assigned)
     └──────────── cancel ───────────┴───┴──────── cancel ─────────┘
```

- Assignment and confirmation are separate actions. A customer is never shown a confirmed appointment until staff confirm it.
- Every status change goes through `RequestWorkflow.transition`. It validates the move, applies it only if the status hasn't changed in the meantime, and writes an immutable `request_events` row (a database trigger blocks UPDATE and DELETE).
- **Eligibility.** A professional can be assigned only if they are:
  - verified, with an active account, and marked available;
  - offering the service's category;
  - serving the address's pincode;
  - working that weekday and slot;
  - not already booked for that date and slot.
- **Concurrency.** The request and professional rows are locked inside the transaction. Partial unique indexes (one active assignment per request; no professional booked twice for the same date and slot) are the final guard.
- **Cancellation.** Customers can cancel until the work starts (`pending`, `assigned`, `confirmed`). Staff cancel with a reason. Cancelling releases the professional.
- **Suspension.** Suspending a professional doesn't move their existing assignments automatically. The API returns `activeAssignments` so operations can reassign them.

## Professional app rules (`/pro/*`)

- A separate session type (`professional`), with its own JWT audience and OTP purpose. Customer and staff tokens are rejected, and vice versa.
- Professionals see only their own assignments. A reassigned or cancelled job keeps its date and service but hides the address, details and customer. The customer's phone is shown only once the appointment is confirmed.
- **Professionals can start and complete their own job, and nothing else:**
  - Start: confirmed → in_progress, on or after the appointment date, and only while verified and active.
  - Complete: in_progress → completed.
  - These go through the same `RequestWorkflow`, writing a status event (actor `professional`), an audit entry (`actorProfessionalId`) and the customer notification.
  - Assign, confirm, reschedule and cancel are staff-only.
- **Appointment protection.** Any change (from the app *or* the dashboard) to categories, pincodes, weekly slots or availability that would make the professional ineligible for one of their active assignments is refused with `affects_assignments`, listing the affected jobs.
- **Reminders.** Day-before reminders for confirmed jobs go through the PostgreSQL job queue (`scheduled_jobs`):
  - One job per assignment and appointment date, due 09:00 IST the day before.
  - Workers claim jobs atomically (`FOR UPDATE SKIP LOCKED`), so it's safe on any number of instances.
  - A 5-minute lease recovers jobs from crashed workers, and every state write is fenced on the worker that holds the claim.
  - Failures retry with exponential backoff and become `failed` after 5 attempts.
  - Each job is re-validated before sending, so a cancelled, reassigned, rescheduled or unconfirmed job is `skipped` with a reason.
  - Configure with `SCHEDULER_ENABLED` and `SCHEDULER_INTERVAL_SECONDS`.
- **Suspension safety.** Suspending or deactivating a professional never cancels or moves their bookings:
  - Each active booking gets an open operations alert (`GET /admin/alerts`, shown on the dashboard).
  - Confirm and start are blocked meanwhile.
  - The alert is resolved only by reassigning, cancelling or reactivating the professional.
- **Notification scope.** Notifications carry an `audience` (`customer` or `professional`), so a person who is both never sees the other app's messages.

## Notifications

Customer notifications are created for:
- request received
- professional assigned
- appointment confirmed
- appointment rescheduled
- request cancelled
- service completed

Each notification is stored (the in-app copy, delivery status `available`) and has a delivery row per channel. Push and SMS rows are `skipped` ("not configured") until a provider exists (`PushSender` / `SmsSender.supportsTransactional`), so nothing is ever reported as `sent` without a provider.

See also `../docs/` for the production readiness audit and the device, provider and deployment checklists.

## Business rules

- A submitted request is **pending**: received and under review, **not** a booking.
- Addresses: Chennai, Tamil Nadu only. No neighbourhood list is invented; serviceability is confirmed per request.
- Sending a request requires a complete profile (full name).
