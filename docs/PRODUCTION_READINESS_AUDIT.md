# Homecare — Production Readiness Audit

_Milestone 5 · 15 Nov 2026, updated for milestone 6 (deployment foundation) · 18 Nov 2026. "Verified" means it was exercised by an automated test or a recorded manual run in this repository. Anything else is stated as unverified._

**Bottom line:** the platform is functionally complete and well covered by automated tests against a real PostgreSQL database. It is **not production-ready yet**:
- No SMS, push, document-storage or payment provider is connected (by design; credentials are needed).
- Neither mobile app has been run on a simulator or physical device.
- The deployment **foundation** now exists (API image, migration job, CI, EAS profiles), but nothing is deployed:
  no hosting, database, registry, Expo project or store account has been set up, and CI has not yet run on GitHub.

The blockers are listed in [§3](#3-critical-production-blockers).

---

## 1. Current architecture

| Part | Path | Stack | Notes |
| --- | --- | --- | --- |
| Website | `website/` | Next.js 16 (App Router, Turbopack), Tailwind v4 | Marketing site. Vercel root `website`; imports `../catalog`. |
| Admin dashboard | `admin/` | Next.js 16, TanStack Query, RHF, Zod | Client-rendered; talks only to the API. |
| API | `backend/` | NestJS 12 (ESM), Prisma 7, PostgreSQL 17, Rspack build | Modular monolith. Swagger at `/docs` (off in production by default). |
| Customer app | `mobile-app/customer-app/` | Expo SDK 58, RN 0.88, Expo Router | |
| Professional app | `mobile-app/professional-app/` | Expo SDK 58, RN 0.88, Expo Router | Separate app, its own session. |
| Shared | `contracts/`, `catalog/`, `design-system/` | Plain TypeScript / JSON | Compiled from source by each consumer. No npm workspaces. |

**Sessions.** One OTP and token core, with three isolated audiences:

| User | Sign-in | Access token | Refresh token | Storage |
| --- | --- | --- | --- | --- |
| Customer | `/auth/*` phone OTP (purpose `customer`) | JWT HS256, audience `homecare-apps`, 15 min | Opaque 256-bit, SHA-256 at rest, rotated each use, 30-day sliding | SecureStore `homecare.session.refresh` |
| Professional | `/pro/auth/*` (purpose `professional`) | Audience `homecare-pro`, 15 min | Same; 30-day sliding | SecureStore `homecare.pro.session.refresh` |
| Staff | `/admin/auth/*` (purpose `staff`; non-staff numbers get no SMS) | Audience `homecare-admin`, 10 min | httpOnly, SameSite=Strict cookie on `/admin/auth`, 12 h absolute, CSRF header required | Browser cookie |

**Session checks:**
- Each guard verifies the JWT audience and that the session row is active and of the same audience, on every request.
- Replaying an already-rotated refresh token revokes the whole session.
- OTP hashes include the purpose, so a code issued for one app can't be used in another.

**Request lifecycle:**
- `pending → assigned → confirmed → in_progress → completed`, plus `cancelled`.
- All transitions go through `RequestWorkflow`, which runs a compare-and-set update and writes an append-only `request_events` row.
- Assignments are guarded by row locks and partial unique indexes (one active assignment per request; no professional booked twice for the same date and slot).

**Background work:** a PostgreSQL job queue (`scheduled_jobs`, see [§5](#5-what-changed-in-this-milestone)) replaces the old in-process reminder timer.

**Notifications.**
- Every notification is stored (in-app copy, `available`), with one delivery row per channel.
- Push and SMS rows are `skipped` because no provider is configured.
- An `audience` column keeps customer and professional notifications apart.

**Audit.**
- `audit_logs` and `request_events` are protected by a database trigger that blocks UPDATE and DELETE.
- Actors are staff, professionals or the system.
- Metadata keys that look like secrets are stripped before writing.

## 2. Confirmed working capabilities (verified)

| Capability | Evidence |
| --- | --- |
| OTP issue/verify, cooldown, hourly cap, attempt cap, expiry, enumeration resistance | `backend/test/auth.e2e-spec.ts` |
| Refresh rotation, reuse detection, logout and expiry for all three audiences | `auth`, `admin-auth`, `pro` e2e suites |
| Audience separation (customer ↔ staff ↔ professional tokens and OTP codes) | `admin-auth`, `pro` e2e suites |
| RBAC per permission; deny-by-default staff routes; disabled staff lose access immediately | `admin-auth.e2e-spec.ts` |
| Profiles, Chennai-only addresses, ownership 404s | `customers-addresses.e2e-spec.ts` |
| Request creation, history, pagination, cancellation rules | `requests.e2e-spec.ts` |
| Eligibility (verification, status, availability, category, pincode, weekly slot, conflicts) | `operations.e2e-spec.ts` |
| Concurrent assignment safety (exactly one winner) | `operations.e2e-spec.ts` |
| Professional job visibility and ownership, start/complete rules, protection of booked appointments | `pro.e2e-spec.ts` |
| **Durable reminders:** exactly once, concurrent workers, crash recovery, retries, failure, reassignment, cancellation, reschedule | `scheduler.e2e-spec.ts` (new) |
| **Suspension workflow** with 0, 1 and many bookings | `suspension.e2e-spec.ts` (new) |
| No-store and security headers; error envelope; body size limit | `security.e2e-spec.ts` (new) |
| Customer journey in a browser against the real API | Puppeteer runs at 390×844 (milestones 2–4) |
| Admin flow at desktop and tablet sizes | Puppeteer runs (milestone 3) |
| Pro app flow at phone size against the real API | Puppeteer run (milestone 4) |
| iOS and Android JS bundles compile for both apps | `expo export` |

## 3. Critical production blockers

| # | Blocker | Why it blocks | Owner / next step |
| --- | --- | --- | --- |
| B1 | **No SMS provider** (OTP) | Nobody can sign in. With `OTP_PROVIDER=none` the API correctly returns 503. | Client: DLT registration and an SMS vendor. See the provider checklist. |
| B2 | **No native device testing** | Keychain/Keystore, keyboards, safe areas, `tel:` and Maps links, and the Android back button are unverified. | Run `docs/DEVICE_TEST_CHECKLIST.md` on EAS development builds. |
| B3 | **No hosting or production database** | The foundation is in place: API Dockerfile with a migration job, CI workflow and EAS profiles (milestone 6). Still missing: API hosting, managed PostgreSQL, a container registry, the Vercel project for the admin, the EAS project (`eas init`) and the per-environment API URLs. | Client: choose the hosting provider and create the accounts. Then follow `docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md`. |
| B4 | **Placeholder identity** | Brand name, `example.com` domain, `com.example.*` bundle IDs, contact details, privacy and terms pages. | Client decisions. Bundle IDs are permanent once published. |
| B5 | **Payments not implemented** | Earnings show "not available"; no pricing or payouts. | Business model and a payment provider (see checklist). |
| B6 | **Verification documents are offline only** | No secure storage; uploads return 503. | Object storage plus a retention policy (see checklist). |

## 4. Security and reliability risks

| Risk | Severity | Status |
| --- | --- | --- |
| In-memory per-IP rate limiting doesn't share state across instances | Medium | **Open.** Per-number OTP limits are durable (in PostgreSQL); per-IP limits are per instance. A shared store (e.g. Redis) or edge rate limiting is needed with more than one instance. |
| Reminder timer could double-send with several instances | High | **Fixed.** PostgreSQL job queue with `SKIP LOCKED` claiming and fencing. |
| Reminders already sent by the old timer would be sent again by the new queue | Medium | **Fixed.** The processor skips a job when the professional was already reminded for it. Found during a live run on the dev database, which now holds one duplicate reminder from before the fix. |
| Suspended professional kept full job details; staff could still confirm or start | High | **Fixed.** Details hidden; confirm and start blocked; bookings flagged for operations. |
| Query strings (admin search terms with names or phones) written to request logs | Medium | **Fixed.** Logs record the path only. |
| API responses cacheable by intermediaries; no security headers | Medium | **Fixed.** `Cache-Control: no-store`, `nosniff`, `DENY`, `no-referrer`. |
| Mobile requests could hang forever on a dead network | Medium | **Fixed.** 15 s timeout returns a network error. |
| External links (`tel:`, Maps, web) failed silently on devices without a handler | Low | **Fixed.** `openExternal` shows a message. |
| OTP request IP is stored as an unsalted SHA-256 | Low | Open. Acceptable for abuse analysis; consider a keyed hash. |
| Staff OTP for non-staff numbers: identical response, but no SMS latency | Low | Accepted. A timing side channel exists in theory; documented. |
| No account deletion or data-export flow (DPDP Act 2023) | Medium | **Open.** Needed before public launch: legal and product decision. |
| The UI copy is duplicated between the two mobile apps | Low | Open. Maintenance risk only. |
| Customer address is visible to an assigned professional before confirmation | Low | By design (planning travel); the phone appears only after confirmation. Revisit with the business. |
| Database connection without TLS or without certificate checks | High | **Fixed in code (milestone 6).** Production startup refuses a `DATABASE_URL` without verified TLS (`sslmode=verify-full`), and the migration image refuses a URL without `sslaccept=strict`. Verified against a disposable TLS PostgreSQL. |
| Database backups and PITR | High | **Open.** Must be configured and restore-tested on the production database. |
| Unresponsive database hangs requests and health checks | Medium | **Partly fixed (milestone 6).** New connections fail after 5 s, TCP keep-alive is on, the readiness check answers 503 within 3 s, and liveness doesn't touch the database. Open: a query already running on an open connection has no time limit; consider a server-side `statement_timeout` for the app user. |
| CORS origins in production could be `http://`, wildcards or paths | Low | **Fixed (milestone 6).** Production requires exact `https://` origins. |
| Proxy trust fixed at one hop (wrong behind CDN + load balancer) | Low | **Fixed (milestone 6).** `TRUST_PROXY` is a hop count (0–5). |
| Admin production build could silently target `http://localhost:4000` | Medium | **Fixed (milestone 6).** Vercel production builds fail without an `https://` `NEXT_PUBLIC_API_BASE_URL`. |
| Store build with placeholder identity or API URL | High | **Guarded (milestone 6).** Production EAS builds refuse `com.example.*` identifiers, a non-HTTPS API URL and the example website. |
| Expo SDK 58 patch releases not applied (`expo` 58.0.26, `expo-router` 58.0.32, `jest-expo` 58.0.15) | Low | **Open.** Published after milestone 5; `expo-doctor` now reports 1 failed check in each app. Apply with `npx expo install --fix` as its own change and re-run the app checks. |

## 5. What changed in milestone 5

1. **Scheduler (`backend/src/modules/scheduler`).**
   - A `scheduled_jobs` table with a unique `dedupe_key` (`job_reminder:<assignment>:<date>`).
   - Atomic claiming (`UPDATE … WHERE id IN (SELECT … FOR UPDATE SKIP LOCKED)`), with a lock lease (`locked_until`, 5 min) for crash recovery.
   - Every state write is fenced on `locked_by`, so a worker that lost its claim can't overwrite another's result.
   - Retries back off exponentially (1 min up to 1 h); after `max_attempts` (5) the job is `failed`.
   - Explicit `sent`, `skipped` (with a reason) and `failed` states; `skipped` and `failed` are audited.
   - Each job is re-validated inside the transaction that creates the notification.
   - Runs in every API instance (`SCHEDULER_ENABLED`, `SCHEDULER_INTERVAL_SECONDS`). **No new infrastructure** (no Redis).
2. **Suspension safety.**
   - An `operations_alerts` table, with one open alert per assignment.
   - Suspending or deactivating flags each active booking; bookings are never cancelled or reassigned automatically.
   - Confirm and start are blocked while the assigned professional can't work.
   - Alerts are resolved only by reassigning, cancelling or reactivating, and resolution is recorded.
   - Shown on the dashboard overview, the request page and the professional page.
3. **Security:** log path redaction, no-store and security headers, suspended-professional data hiding, acknowledge limited to active accounts.
4. **Mobile:** request timeouts and safe external links, in both apps.

## 5a. What changed in milestone 6 (deployment foundation)

1. **API image** (`backend/Dockerfile`, `backend/Dockerfile.dockerignore`):
   - multi-stage build on a digest-pinned Node 26.3.0, with `npm ci` from the lockfile
   - production dependencies only in the runtime image (≈150 MB of `node_modules`, down from ≈400 MB with npm's defaults)
   - non-root user with root-owned code, no `.env`, a liveness `HEALTHCHECK` and clean SIGTERM handling
   - separate `migrate` target for `prisma migrate deploy` and the staff bootstrap
2. **Production safeguards:** database TLS enforced (API and migrations), https-only CORS, hop-count `TRUST_PROXY`, pool timeouts, bounded readiness, `/health/live`.
3. **CI** (`.github/workflows/ci.yml`) and a disposable Docker smoke test (`backend/scripts/docker-smoke.sh`).
4. **EAS:** `eas.json` with development, preview and production profiles; `app.config.ts` variants; a production placeholder guard; `expo-dev-client` added to both apps.
5. **Admin:** production build guard for the API URL.

**Verified locally (18 Nov 2026):**
- Both images built for linux/arm64 (native) and linux/amd64 (emulated).
- The smoke test passed 27/27 on both architectures.
- Every CI step was run by hand, the backend job against a disposable PostgreSQL 17.
- `actionlint` passed, and `eas.json` was parsed by `@expo/eas-json` 27.10.0.

**Not verified:**
- The workflow has not run on GitHub Actions.
- No EAS build has been made (that needs an authenticated Expo account).
- Nothing was deployed.

## 6. Test inventory and gaps

| Suite | Tests | Gaps |
| --- | --- | --- |
| Backend unit (Vitest) | 41 (includes production-configuration rules) | |
| Backend integration (Vitest + PostgreSQL) | 125 across 9 files | Load testing, multi-instance throttling, migration rollback drills |
| API image smoke test (`backend/scripts/docker-smoke.sh`) | 27 checks | Real hosting platform, real managed database, TLS with a public CA |
| Customer app (Jest + RNTL + router testing) | 45 | Native-only behaviour (Keychain, keyboard, permissions) |
| Pro app | 17 | Same |
| Admin | Typecheck, lint, build, manual browser run | No automated UI tests |
| Website | Typecheck, lint, build | Lighthouse in CI |

## 7. Recommended implementation sequence

1. **Hosting (B3):** choose the API host and a managed PostgreSQL with TLS and PITR. Push the repository so CI runs, and make its jobs required. Create the admin's Vercel project and the EAS projects (`eas init`). The image, migration job, CI and EAS profiles already exist (milestone 6).
2. **Identity decisions (B4):** brand, domain and bundle IDs, then legal pages and contact details.
3. **SMS for OTP (B1):** DLT registration takes weeks, so start it first in parallel.
4. **Device testing (B2):** EAS development builds; run the device checklist on at least one iPhone and two Android devices (one low-end).
5. **Push notifications:** EAS project, FCM and APNs credentials, device-token table, delivery receipts.
6. **Rate limiting across instances:** a shared store or edge rules before scaling past one API instance.
7. **Document storage (B6), then payments (B5).**
8. **Compliance:** account deletion and data export, retention policy, incident runbook.
