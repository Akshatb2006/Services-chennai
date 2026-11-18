# syntax=docker/dockerfile:1.7
#
# Homecare API image. Build from the REPOSITORY ROOT (the API bundles ../catalog and ../contracts):
#
#   docker build -f backend/Dockerfile -t homecare-api:<version> .                  # runtime (default)
#   docker build -f backend/Dockerfile --target migrate -t homecare-api-migrate:<version> .
#
# Targets
#   runtime  `node dist/main.js` — production dependencies only, non-root, health check
#   migrate  `prisma migrate deploy` (default) and `npm run staff:create` — one-off jobs; never serves traffic
#
# No .env file is copied into any stage; all configuration comes from the environment at run time.

# Node 26.3.0, the version every check was run with (see /.nvmrc). Pinned by digest for reproducible builds;
# to upgrade, change both the tag and the digest (`docker buildx imagetools inspect node:<tag>`).
FROM node:26.3.0-bookworm-slim@sha256:3fe807a03a4436e7bc76b7e84e6861899cd75c9028ae99bc00581940141ae150 AS base
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false
WORKDIR /repo

# All dependencies (build + Prisma CLI), from the lockfile.
FROM base AS deps
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci

# Generate the Prisma client and bundle the API (Rspack bundles ../catalog and ../contracts).
FROM deps AS build
COPY catalog ./catalog
COPY contracts ./contracts
COPY backend ./backend
RUN cd backend && npm run build

# Production dependencies only. `--omit=optional` also drops "devOptional" packages: @prisma/client declares the
# Prisma CLI and TypeScript as optional peers, which npm would otherwise install (~150 MB) though the bundled
# runtime never loads them. The only prod-only optional package is pg-cloudflare (Cloudflare Workers, unused on
# Node). Install scripts aren't needed by any runtime dependency.
FROM base AS prod-deps
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev --omit=optional --ignore-scripts

# One-off operations image: `prisma migrate deploy` by default (applies committed migrations only; never
# `migrate dev` or `reset`). It also runs `npm run staff:create` to bootstrap the first super admin.
# Built from the build stage, so it carries dev dependencies and source: never use it to serve traffic.
FROM build AS migrate
# Refuse to migrate unless MIGRATION_DATABASE_URL verifies TLS (see prisma.config.ts).
ENV REQUIRE_DB_TLS=true
WORKDIR /repo/backend
USER node
CMD ["node", "node_modules/prisma/build/index.js", "migrate", "deploy"]

# Runtime image (default target).
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=4000
WORKDIR /app
# Files stay owned by root (read-only for the app user), so a compromised process can't rewrite the code.
COPY --from=prod-deps /repo/backend/node_modules ./node_modules
COPY --from=build /repo/backend/dist ./dist
COPY backend/package.json ./
USER node
EXPOSE 4000
# Nest handles SIGTERM (enableShutdownHooks): stops accepting requests, stops the scheduler, closes the DB pool.
STOPSIGNAL SIGTERM
# Liveness only (no database), so a database outage doesn't get every container restarted.
# Load balancers should route on readiness instead: GET /health (checks the database).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health/live').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "dist/main.js"]
