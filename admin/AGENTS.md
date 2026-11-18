<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Homecare admin rules

- All data comes from the NestJS API (`../backend`) via `src/lib/api.ts`. No fake data and no second backend.
- Use types and Zod schemas from `@homecare/contracts`. Permissions are enforced by the API, and the UI only hides controls (`useSession().can`).
- Request status changes only through the workflow endpoints (`/admin/requests/:id/{assign,reassign,confirm,reschedule,start,complete,cancel}`). Never set a status directly.
