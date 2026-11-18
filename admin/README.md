# Homecare Ops — admin dashboard

Next.js 16 (App Router) · TanStack Query · React Hook Form · Zod · Lucide · shared design tokens.
The operations control centre for the business team. It talks only to the existing NestJS API (`../backend`) and has no data of its own.

## Run it

```bash
# API first (see backend/README.md), with http://localhost:3001 in CORS_ORIGINS
cd admin
npm install
cp .env.example .env.local      # NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
npm run dev                     # http://localhost:3001
npm run typecheck && npm run lint && npm run build
```

**First sign-in.** Grant a phone number dashboard access on the server, then sign in with an OTP sent to that number. In development, the code is printed in the API terminal.

```bash
cd backend && npm run staff:create -- --phone "98400 12345" --name "Your Name" --role super_admin
```

There are no passwords and no bypass. After the first super admin exists, add other staff under **Staff**.

## Pages

| Page | What it does | Permission |
| --- | --- | --- |
| Overview | Live counts by status (with date and category filters), review queue, professional counts, recent activity | `overview.read` |
| Requests | Paged list; search by reference (`#3F2A…`), customer name or phone; filter by status, category, service and dates | `requests.read` |
| Request detail | Requirements, schedule, address snapshot, status history, customer notifications with delivery state, assignment history; actions allowed for the current state and your role | `requests.*` |
| Professionals | Register, edit categories, serviceable pincodes and weekly availability; verify or reject; suspend or deactivate | `professionals.*` |
| Customers | Search; profile, saved addresses, request history (read-only) | `customers.read` |
| Services | Pause or resume a catalogue service (ids and copy stay in `@homecare/catalog`) | `services.*` |
| Audit log | Append-only record of administrative actions | `audit.read` |
| Staff | Add staff, change roles, disable access | `staff.manage` |

The UI hides controls you can't use. **The API enforces every permission regardless.**

## Session security

- The access token is kept in memory only, never in localStorage.
- The refresh token is an **httpOnly, SameSite=Strict cookie** set by the API (path `/admin/auth`). Page JavaScript can't read it.
- Refresh calls send an `x-homecare-admin: 1` header, which forces a CORS preflight (CSRF protection).
- Staff sessions last at most 12 hours and don't slide, so staff sign in again every day.
- Disabling a staff member revokes their sessions immediately.
- Pages are served with `noindex`, `X-Frame-Options: DENY` and `Referrer-Policy: same-origin`.

## Deploying

This is a separate Next.js project (Vercel root directory: `admin`). Keep "include files outside the root directory" enabled, because it imports `../contracts` and `../catalog`. Put it on a subdomain of the API's site (e.g. `ops.example.in` with `api.example.in`) so the SameSite cookie works, and add its origin to the API's `CORS_ORIGINS`.
