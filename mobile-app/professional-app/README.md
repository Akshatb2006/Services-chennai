# Homecare Pro — professional app

Expo SDK 58 / React Native 0.88 app for Homecare service professionals. It talks only to the existing API (`../../backend`, `/pro/*` routes), using the same professional records, eligibility rules, request workflow, notifications and audit log as the ops dashboard.

## Run it

```bash
# API first (see backend/README.md), with http://localhost:8082 in CORS_ORIGINS for the web preview
cd mobile-app/professional-app
npm install
cp .env.example .env            # EXPO_PUBLIC_API_BASE_URL (10.0.2.2 on the Android emulator, LAN IP on a device)
npm start                       # i / a / w
npm run web -- --port 8082      # browser preview (the customer app uses 8081)
npm run check                   # typecheck + lint + tests
```

In development, sign-in codes are printed in the API terminal (`OTP_PROVIDER=console`).

**Temporary identifiers:** `com.example.homecare.pro`, scheme `homecarepro`, display name "Homecare Pro". Replace them before store submission.

## What it does

| Area | Behaviour |
| --- | --- |
| Sign-in | Phone + OTP. Uses its own session type and its own SecureStore key (`homecare.pro.session.refresh`), separate from the customer app. The access token is kept in memory and the refresh token rotates on every refresh. |
| Onboarding | If ops already registered this number, the account links to that record. Otherwise the professional registers: name, service categories, pincodes and weekly availability. The profile starts as **pending verification**. |
| Verification | Pending, verified and rejected states each explain what happens next. Only Homecare staff can change verification or account status, and the API doesn't accept those fields from the app. |
| Home | Greeting, verification, availability switch, today's jobs, upcoming jobs, recent notifications. |
| Jobs | Upcoming, completed and cancelled/reassigned, plus job detail: requirements, address (with Maps), the customer's first name, and their phone once the appointment is confirmed. |
| Job actions | Acknowledge (informational); start (confirmed jobs only, on or after the appointment date); complete (in-progress jobs only). Every rule is enforced by the API. Assign, confirm, reschedule and cancel are staff-only. |
| Schedule | Booked jobs for the next 14 days, plus the weekly availability grid. |
| Availability | Weekly slots and an available/unavailable switch. The API refuses changes that would break an assigned or confirmed job (`affects_assignments`), and the app lists the affected jobs. |
| Earnings | Shows "not available yet": payments don't exist in the backend, so no figures are shown or estimated. |
| Documents | Shows what's needed. Uploads are disabled until secure storage is connected (the API returns 503). |
| Notifications | In-app list: assigned, confirmed, rescheduled, no longer assigned, day-before reminder, completed. Push isn't connected. |

## Structure

Same conventions as `../customer-app`: routes in `src/app`, server state via TanStack Query hooks (`src/features/*/hooks.ts`), a single API client (`src/services/api/client.ts`), and client session state in Zustand (`src/store/session.ts`).

- **Shared:** `@homecare/design-system` (tokens), `@homecare/contracts` (types and Zod schemas), `@homecare/catalog` (categories and services).
- **Copied:** the UI primitives in `src/components` were copied from the customer app. A follow-up could extract them into a shared mobile UI package.
- **Look:** a more operational variant of the same brand, with a Carbon Ink tab bar, ink date tiles on job cards and strong status badges.

## Tests

`npm test` covers:
- session restore, refresh and logout
- sign-in and registration (no verification fields sent)
- verification states
- jobs listed per tab from the API
- the start → complete flow
- a blocked start that shows its reason and hides the customer's phone
- the availability conflict message
- earnings never showing amounts
- notifications

They run against an in-memory fake of the `/pro` contract (`__tests__/support/fake-pro-api.ts`). The backend's real rules are covered by `backend/test/pro.e2e-spec.ts`, which runs against Postgres.

## Builds (EAS)

`eas.json` defines three profiles, and `app.config.ts` derives the variant from `app.json`:

| Profile | Installs as | API URL |
| --- | --- | --- |
| `development` | "Homecare Pro (Dev)", `<id>.dev` (dev client) | From your local `.env`, via `npx expo start` |
| `preview` | "Homecare Pro (Preview)", `<id>.preview` (internal; Android APK) | EAS environment `preview` |
| `production` | `app.json` identity (store) | EAS environment `production` |

Production builds refuse to run while:
- the identifiers are `com.example.*`
- the API URL isn't `https://`
- the website is still `example.com`

The EAS project hasn't been created yet: the account owner runs `npx eas-cli@latest init` here once. See
[`docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md`](../../docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md) §6 for the exact
commands. Nothing has been built on EAS or published.

## Not yet verified on devices

Neither native build has been run on a simulator or phone (no Xcode or Android SDK on the build machine). The iOS and Android bundles compile, and the app was exercised against the real API in a browser at 390×844.
