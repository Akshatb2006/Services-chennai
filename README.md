# Homecare — Chennai home services

| Folder | What |
| --- | --- |
| `website/` | Next.js marketing site (deploy this) |
| `backend/` | NestJS + PostgreSQL API: customer app and operations (auth, requests, professionals, assignment, audit) |
| `admin/` | Next.js operations dashboard for the Homecare team |
| `mobile-app/customer-app/` | Expo / React Native customer app |
| `mobile-app/professional-app/` | Expo / React Native app for service professionals (Homecare Pro) |
| `design-system/` | `@homecare/design-system`: shared design tokens (Node build script → `dist/` + `website/src/styles/tokens.css`) |
| `catalog/` | `@homecare/catalog`: shared service catalogue used by the website, the API and the apps |
| `contracts/` | `@homecare/contracts`: API contract (Zod schemas, statuses, types) shared by the API and the apps |

## Local development

1. **API:** see [`backend/README.md`](backend/README.md) (Docker Postgres, migrations, `npm run start:dev`, Swagger at `/docs`).
2. **Ops dashboard:** see [`admin/README.md`](admin/README.md) (`npm run dev` on :3001; bootstrap a staff account with `npm run staff:create` in `backend/`).
3. **Pro app:** see [`mobile-app/professional-app/README.md`](mobile-app/professional-app/README.md) (web preview on :8082).
4. **App:** see [`mobile-app/customer-app/README.md`](mobile-app/customer-app/README.md). Point `EXPO_PUBLIC_API_BASE_URL` at the API.
5. **Website:** see `website/README.md`.

## CI

`.github/workflows/ci.yml` checks every pull request and every push to `main`: backend (Prisma, migrations,
typecheck, lint, unit and PostgreSQL integration tests, build), the API Docker image (build plus a disposable
smoke test), admin, website, and both apps (tests, typecheck, lint, iOS/Android export). It never deploys.
Node version: `.nvmrc`.

## Deploy

Nothing is deployed automatically. See [`docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md`](docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md)
for the API image and migrations, the admin on Vercel, EAS builds for the apps, environment variables and rollback.

**Website (Vercel, existing setup):** import the repo and set **Root Directory = `website`**. Framework preset: Next.js. Keep "Include files outside the root directory" enabled (the default), because the website imports `../catalog`. See `website/README.md` and `website/.env.example` for environment variables (store URLs, analytics).
