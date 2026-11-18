# Production deployment checklist

**Nothing has been deployed and no app has been published.** This repository contains the deployment
*foundation*: an API container image, a migration job, CI and EAS build profiles. A configured pipeline is not
a working production system. Every step below that needs an account, a domain or a credential is still to be done.

The API hosting provider hasn't been chosen, so the API sections use plain `docker` commands that map onto any
container platform. Vercel is used only where it's already in use (the website) or recommended (the admin).

Contents:
0. Decisions and accounts
1. Environment variables (API)
2. Database
3. API image: build, migrate, start
4. Admin dashboard (Vercel)
5. Website (Vercel, unchanged)
6. Mobile apps (EAS)
7. CI
8. Release procedure
9. Rollback
10. Operations

---

## 0. Decisions & accounts (client)

- [ ] **Final brand name, domains and app names.** Replace:
  - `homecare.example.com` in `website/src/config/brand.ts`, and `EXPO_PUBLIC_WEB_URL` (see §6)
  - `com.example.homecare.customer` / `com.example.homecare.pro` in both `app.json` files. **These are permanent
    once a store listing exists.** Production EAS builds refuse to run while they're placeholders.
  - contact details, privacy and terms pages
- [ ] Apple Developer Program and Google Play Console accounts, owned by the business (organisation accounts).
- [ ] Expo account or organisation for EAS, owned by the business.
- [ ] Hosting for PostgreSQL and the API container (provider not chosen), with an **India region**.
- [ ] Container registry (any OCI registry) for the API image.
- [ ] DLT registration and an SMS vendor (`PROVIDER_INTEGRATION_CHECKLIST.md` §1). **Until then nobody, including
      staff, can sign in to production**: `OTP_PROVIDER=none` makes every send-code request return 503.

## 1. Environment variables (API)

Validated at startup by `backend/src/config/env.ts`. The process exits with a list of problems instead of
starting with an unsafe value. In production it refuses:
- a missing or short `JWT_ACCESS_SECRET` / `OTP_PEPPER`, or the two being equal
- `OTP_PROVIDER=console`
- a `DATABASE_URL` without verified TLS
- any `CORS_ORIGINS` entry that isn't an exact `https://` origin

| Variable | Secret | Production value |
| --- | --- | --- |
| `NODE_ENV` | | `production` (already set in the image) |
| `PORT` | | `4000` (image default) |
| `DATABASE_URL` | **yes** | App user. `postgresql://USER:PASS@HOST:5432/DB?sslmode=verify-full` (add `&sslrootcert=/certs/ca.crt` for a private CA, see §2) |
| `MIGRATION_DATABASE_URL` | **yes** | Migration job only (DDL user). `postgresql://USER:PASS@HOST:5432/DB?sslmode=require&sslaccept=strict` (add `&sslcert=/certs/ca.crt` for a private CA) |
| `JWT_ACCESS_SECRET` | **yes** | 48+ random bytes (see below) |
| `OTP_PEPPER` | **yes** | 48+ random bytes, different from the JWT secret. Rotating it invalidates pending codes only. |
| `OTP_PROVIDER` | | `none` until an SMS vendor is integrated (then the vendor name) |
| `CORS_ORIGINS` | | The admin origin only, e.g. `https://ops.<domain>`. Native apps need no CORS. |
| `TRUST_PROXY` | | The number of proxies in front of the API: `1` behind one load balancer; `2` for CDN → load balancer; `false` if exposed directly. **Never more than the real number**: extra hops let clients spoof their IP and dodge rate limits. |
| `SWAGGER_ENABLED` | | Unset (off in production) |
| `LOG_LEVEL` | | `info` |
| `SCHEDULER_ENABLED` | | `true` on every instance. Safe: reminder jobs are claimed in PostgreSQL (`FOR UPDATE SKIP LOCKED`). |
| `SCHEDULER_INTERVAL_SECONDS` | | `60` |
| `RATE_LIMIT_PER_MINUTE` | | `120` (per IP, **per instance**: see §10) |
| `ACCESS_TOKEN_TTL_SECONDS`, `REFRESH_TOKEN_TTL_DAYS` | | Defaults: `900`, `30` |
| `ADMIN_ACCESS_TOKEN_TTL_SECONDS`, `ADMIN_SESSION_TTL_HOURS` | | Defaults: `600`, `12` |
| `OTP_TTL_SECONDS`, `OTP_RESEND_COOLDOWN_SECONDS`, `OTP_MAX_ATTEMPTS`, `OTP_MAX_SENDS_PER_HOUR` | | Defaults: `300`, `30`, `5`, `5` |

Generate each secret separately and store it only in the platform's secret manager:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

No secret is committed to the repository. `.env` files are git-ignored, excluded from the Docker build context
(`backend/Dockerfile.dockerignore`) and never copied into an image.

## 2. Database (PostgreSQL 17)

- [ ] Managed PostgreSQL 17 in an India region: TLS required, automated backups, point-in-time recovery
      (PITR), and **a restore that has actually been tested**.
- [ ] Two database users: a migration user (owns the schema, DDL) and an app user (DML on the tables only), if
      the provider allows it.
- [ ] **TLS with certificate verification.** The API and the migration job use different drivers that spell
      the same thing differently:

      | Process | Driver | Verified TLS | Private CA bundle |
      | --- | --- | --- | --- |
      | API (`DATABASE_URL`) | node-postgres | `sslmode=verify-full` | `&sslrootcert=/certs/ca.crt` |
      | Migration job (`MIGRATION_DATABASE_URL`) | Prisma migration engine | `sslmode=require&sslaccept=strict` | `&sslcert=/certs/ca.crt` |

      Without `sslaccept=strict` Prisma accepts **any** certificate, so the migration image refuses to run
      without it. If the provider's certificate isn't signed by a public CA (many managed databases use their
      own), download the provider's CA bundle and mount it read-only at `/certs/ca.crt`.
- [ ] Connection budget: each API instance holds a `pg` pool (default 10). Keep `instances × 10` well under
      `max_connections`, or add PgBouncer in transaction mode.

## 3. API image (`backend/Dockerfile`)

Build from the **repository root**: the API bundles `catalog/` and `contracts/`.

| Target | Contents | Use |
| --- | --- | --- |
| `runtime` (default) | Node 26.3.0 (digest-pinned), production dependencies only (≈150 MB), bundled `dist/`, root-owned read-only files, user `node` | Serves traffic: `node dist/main.js` |
| `migrate` | Build stage with dev dependencies and Prisma CLI; `REQUIRE_DB_TLS=true` | One-off jobs: `prisma migrate deploy` (default), `npm run staff:create` |

### 3.1 Build and push

```bash
VERSION=$(git rev-parse --short HEAD)
REGISTRY=<registry>/<namespace>            # chosen with the hosting provider

docker buildx build --platform linux/amd64 -f backend/Dockerfile                  -t $REGISTRY/homecare-api:$VERSION         --push .
docker buildx build --platform linux/amd64 -f backend/Dockerfile --target migrate -t $REGISTRY/homecare-api-migrate:$VERSION --push .
```

- Use `--platform` to match the hosts (most are `linux/amd64`).
- Tag with the commit, never only `latest`, so rollback is a tag change.
- Reproducibility: `npm ci` from the committed lockfiles, and the base image pinned by digest. To upgrade Node,
  change the tag and the digest together.

### 3.2 Run migrations (once per release, before the new API version takes traffic)

```bash
docker run --rm \
  -e MIGRATION_DATABASE_URL='postgresql://MIGRATOR:PASS@HOST:5432/DB?sslmode=require&sslaccept=strict' \
  $REGISTRY/homecare-api-migrate:$VERSION
# private CA: add  -v /path/ca.crt:/certs/ca.crt:ro  and append &sslcert=/certs/ca.crt to the URL
```

- Expected output: `All migrations have been successfully applied.` or `No pending migrations to apply.`
  Any other result is a failed release: don't roll out the new API (see §9).
- This runs `prisma migrate deploy`. It applies only committed migration files in order and is safe to re-run.
  **Never** run `migrate dev`, `migrate reset` or `db push` against production.
- First deploy only: check the custom constraints exist.
  ```sql
  select count(*) from pg_trigger where not tgisinternal and tgfoid = 'forbid_mutation'::regproc;  -- 2 or more
  \d assignments                                                                                     -- partial unique indexes
  ```

### 3.3 Start the API

```bash
docker run -d --name homecare-api --restart unless-stopped -p 4000:4000 \
  --env-file /secure/homecare-api.env \
  --stop-timeout 30 \
  $REGISTRY/homecare-api:$VERSION
```

- `/secure/homecare-api.env` is a placeholder for the platform's secret injection; never bake env files into
  images.
- **Readiness:** `GET /health`. It returns 200 only when the database answers within 3 s, otherwise 503. Load
  balancers should route on this.
- **Liveness:** `GET /health/live`. It's process-only and doesn't touch the database. The image's `HEALTHCHECK`
  uses it, so a database outage doesn't restart every container.
- **Shutdown:** SIGTERM closes the HTTP server, stops the scheduler and closes the pool (exit code 0, about 1 s
  in tests). Give it a grace period of at least 10 s. A reminder job claimed during shutdown is picked up by
  another instance after its 5-minute lease.
- HTTPS terminates at the load balancer or CDN. Enable HSTS on the API domain there.
- Logs are JSON (pino) on stdout. Bodies aren't logged, `Authorization` is redacted and query strings are
  stripped. Keep logs 30–90 days.

### 3.4 First super admin

```bash
docker run --rm -e DATABASE_URL='postgresql://…?sslmode=verify-full' \
  $REGISTRY/homecare-api-migrate:$VERSION \
  npm run -s staff:create -- --phone "<mobile>" --name "<full name>" --role super_admin
```

The new admin can only sign in after an SMS provider is connected (§0).

## 4. Admin dashboard (`admin/`) on Vercel

1. New Vercel project from this repository. Set **Root Directory = `admin`**, framework Next.js, and keep
   **"Include files outside the root directory"** on: it imports `../contracts`, `../catalog` and the design
   tokens.
2. Environment variable `NEXT_PUBLIC_API_BASE_URL = https://api.<domain>`, with no trailing slash.
   **Production builds fail** if it's missing or not `https://` (guard in `admin/next.config.ts`); local, CI and
   preview builds fall back to `http://localhost:4000`.
3. Domain: put the dashboard on the **same site** as the API, e.g. `ops.<domain>` and `api.<domain>`. The staff
   refresh token is a `SameSite=Strict` cookie and won't be sent cross-site. Then add `https://ops.<domain>` to
   the API's `CORS_ORIGINS`.
4. Vercel preview URLs (`*.vercel.app`) are a different site, so **staff sign-in won't work on preview
   deployments** against the production API. Use previews for UI review only, or point their
   `NEXT_PUBLIC_API_BASE_URL` (Preview environment) at a staging API on the same site as a custom preview domain.
5. Optional: restrict dashboard access with Vercel deployment protection, an IP allowlist or SSO.
6. Node.js version: CI tests Node 26.3.0 (`.nvmrc`). In Project Settings choose the closest version Vercel
   offers.

## 5. Website (`website/`) on Vercel: existing setup, unchanged

This milestone didn't touch the website's Vercel configuration. There is no `vercel.json`; the project uses
**Root Directory = `website`**, with "Include files outside the root directory" on (it imports `../catalog`).
Deploys continue as before via Vercel's Git integration.

- [ ] Set the real domain in `website/src/config/brand.ts` once chosen.
- [ ] Set `NEXT_PUBLIC_CUSTOMER_IOS_URL`, `_ANDROID_URL`, `NEXT_PUBLIC_PRO_IOS_URL` and `_ANDROID_URL` once the
      store listings exist. Until then the buttons go to the store home pages.

## 6. Mobile apps on EAS (`mobile-app/customer-app`, `mobile-app/professional-app`)

Each app has `eas.json` (EAS CLI ≥ 27, app versions managed remotely by EAS) and `app.config.ts`, which builds
three variants from `app.json`:

| Profile | `APP_VARIANT` | Name / identifier | Distribution | API URL comes from |
| --- | --- | --- | --- | --- |
| `development` | `development` | "Homecare (Dev)" / `<id>.dev`, scheme `homecare-dev` | internal; Android APK; includes `expo-dev-client` | The local Metro server's `.env` (JS is served by `npx expo start`) |
| `preview` | `preview` | "Homecare (Preview)" / `<id>.preview` | internal; Android APK | EAS environment **preview** |
| `production` | `production` | `app.json` as is | store (AAB / IPA); build number auto-incremented | EAS environment **production** |

The Pro app works the same way: "Homecare Pro (Dev)", `com.example.homecare.pro.dev`, and so on.

**Production builds refuse to run** (`app.config.ts`) while any of these is still true:
- either identifier starts with `com.example.`
- on the EAS build server, `EXPO_PUBLIC_API_BASE_URL` isn't an `https://` origin
- on the EAS build server, `EXPO_PUBLIC_WEB_URL` is missing or still `example.com`

### 6.1 One-time setup (account owner, authenticated)

Not done: it needs the business's Expo account. Run this in **each** app folder:

```bash
npx eas-cli@latest login
npx eas-cli@latest init          # creates the EAS project and prints its ID
```

Because the config is dynamic (`app.config.ts`), `eas init` may ask you to add the ID yourself. Put it in
`app.json` (the config passes it through), then commit:

```json
"extra": { "eas": { "projectId": "<id printed by eas init>" } }
```

Add `"owner": "<expo-organisation>"` under `expo` if the project belongs to an organisation.

Set the per-environment values. `EXPO_PUBLIC_*` values are compiled into the app binary, so they're
configuration, **not secrets**:

```bash
npx eas-cli@latest env:create --environment preview    --name EXPO_PUBLIC_API_BASE_URL --value https://<staging-api-origin> --visibility plaintext
npx eas-cli@latest env:create --environment preview    --name EXPO_PUBLIC_WEB_URL      --value https://<website-origin>     --visibility plaintext
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_API_BASE_URL --value https://api.<domain>         --visibility plaintext
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_WEB_URL      --value https://<domain>             --visibility plaintext
```

### 6.2 Builds

```bash
cd mobile-app/customer-app        # and mobile-app/professional-app
npx eas-cli@latest build --profile development --platform android   # installable APK; then `npx expo start` on the dev machine
npx eas-cli@latest build --profile development --platform ios       # needs the Apple account; register test devices with `eas device:create`
npx eas-cli@latest build --profile preview     --platform all       # internal testers
npx eas-cli@latest build --profile production  --platform all       # only after §0 identity decisions; refused before
```

Notes:
- **Monorepo upload.** EAS uploads the git repository from its root, respecting `.gitignore`, because the apps
  import `../../catalog`, `../../contracts` and `../../design-system`. `.env` files are git-ignored and are not
  uploaded.
- **iOS internal builds** need registered App IDs in the Apple account. Registering `com.example.*` identifiers is
  inappropriate, so in practice iOS builds of any profile wait for the final identifier. Android development and
  preview builds can be made now.
- **Submission** (`eas submit`) and **OTA updates** (`eas update`, which needs `expo-updates`) are not configured.
  Add them when store accounts exist.
- Run `docs/DEVICE_TEST_CHECKLIST.md` on development or preview builds before any production build.

## 7. CI (`.github/workflows/ci.yml`)

It runs on every pull request and on every push to `main`. It needs no secrets, never deploys and never touches
a real database.

| Job | Checks |
| --- | --- |
| `backend` | `prisma validate`; on PRs, committed migrations unchanged; `migrate deploy` + `migrate status` on an empty PostgreSQL 17 service; schema/migration drift (`migrate diff --exit-code`); typecheck; lint; unit tests; integration tests; build |
| `api-image` | Builds the `runtime` and `migrate` images, then `backend/scripts/docker-smoke.sh`: a disposable TLS PostgreSQL, migration refusal and success, staff bootstrap, startup refusals, health, CORS, a database outage, SIGTERM |
| `admin` | typecheck, lint, production build |
| `website` | `next typegen` + `tsc`, lint, production build |
| `mobile` (customer and Pro) | typecheck, lint, Jest, `expo export` for iOS and Android |

Actions are pinned to commit SHAs, the token is read-only and checkout doesn't persist credentials. Make the five
jobs **required status checks** on `main` in the GitHub branch protection settings.

## 8. Release procedure

1. CI is green on the commit being released.
2. Build and push both API images tagged with the commit (§3.1).
3. Run the migration job (§3.2). It must succeed before step 4.
4. Roll out the new API instances. Wait for `/health` to return 200, then watch the 5xx rate, the
   `send-otp` 503 rate and the logs.
5. Deploy the admin (Vercel, `admin`) and the website (Vercel, `website`).
6. Mobile: build with EAS and submit for review. Keep the API backward compatible with the app version still in
   users' hands.

**Migrations must be backward compatible with the previous API version** (expand, then contract). For example,
add the new column in release N, start using it in N, and drop the old one in N+1. That's what makes the code
rollback in §9 safe.

## 9. Rollback

| What | How |
| --- | --- |
| API code | Redeploy the previous image tag. Safe while the migrations follow the expand/contract rule in §8. |
| A migration that **failed** | `prisma migrate status` shows it as failed, and the new API must not be rolled out. Prisma doesn't undo a failed migration, so inspect the database for anything partly applied. Then either revert those changes by hand and run `prisma migrate resolve --rolled-back <migration_name>` (from the migrate image) before fixing the migration, or complete them and mark it `--applied`. |
| A migration that **succeeded but is wrong** | Fix forward with a new migration. Restore from PITR only for data loss, and accept losing writes made after the restore point. **Never** `migrate reset`. |
| Admin / website | Vercel → Deployments → previous deployment → **Instant Rollback**. |
| Mobile apps | Store binaries can't be rolled back. Release a fixed build with a higher version, and keep the API compatible meanwhile. |
| Secrets | Rotating `JWT_ACCESS_SECRET` signs everyone out of access tokens (refresh tokens survive). Rotating `OTP_PEPPER` invalidates only pending codes. |

## 10. Operations

- [ ] **Rate limiting across instances.** The per-IP throttler is in memory, so with N instances a client gets up
      to N× the limit. Before scaling past one instance, add edge rate limiting (load balancer or WAF) for
      `/auth/*`, `/pro/auth/*` and `/admin/auth/*`, or a shared throttler store. Per-number OTP limits are already
      durable in PostgreSQL and hold across instances.
- [ ] On-call contact and an incident runbook: database restore, secret rotation (§9).
- [ ] Watch daily:
  - open booking alerts (dashboard overview)
  - `select * from scheduled_jobs where status = 'failed'`
  - the audit log for `bookings.flagged` and `reminder.failed`
- [ ] Data protection: a retention policy, account deletion and export flows (**missing**), and a breach
      procedure under the DPDP Act 2023.
