# HOMECARE — website

Marketing site for a Chennai home-services startup (brand name is a placeholder).
Next.js 16 (App Router) · TypeScript · Tailwind v4 · Lucide. Brand tokens come from `../design-system` (run `node ../design-system/scripts/build.mjs` after editing them).

```bash
npm run dev                     # development
npm run build && npm start      # production (use this for Lighthouse)
```

## Before launch — replace placeholders
- `src/config/brand.ts`: name, domain
- **App store listings** — set the four real listing URLs (env vars in `.env.example`, or fallbacks in `src/config/apps.ts`).
  Until set, badges in the default **live** launch mode link to the App Store / Google Play *homepages* (placeholder).
  `NEXT_PUBLIC_APP_LAUNCH_MODE=prelaunch` switches to "Get early access" + "Coming soon" badges instead.
- `src/config/contact.ts`: phone, email, socials
- `src/config/location.ts`: add `confirmedAreas` once neighbourhoods are confirmed
- `src/content/home.ts`: replace demo testimonials and set `isDemo: false`
- `src/app/privacy`, `src/app/terms`: placeholder legal text

## App acquisition
- `src/config/apps.ts` — single source of truth: per-app, per-platform store status/URLs, launch mode, `/get-app` path, deep-link config.
- `/get-app` (stable URL, used by all buttons): phones → their store; desktop → both badges. `?app=professional` for the Pro app.
- `/professionals` — separate recruitment journey with its own Pro app store links.
- Analytics events (`src/lib/analytics.ts`): `download_cta_clicked`, `store_option_selected`, `early_access_submitted`, `qr_code_scanned`, `app_store_redirected`. Provider via `NEXT_PUBLIC_ANALYTICS_PROVIDER` (none | gtm | ga4 | plausible). No event claims an install.
- Pre-launch only: early-access form → `POST /api/early-access` → forwards to `EARLY_ACCESS_WEBHOOK_URL`; returns 503 (never fake success) if unset.

Services live in `src/config/services.ts`. If you add or rename a slug, update `src/config/service-slugs.ts` too (the build fails if they drift).

## Photography
Free-licence photos from Unsplash (Unsplash License), in `src/assets/photos` (`https://unsplash.com/photos/<id>`):
hero `2NcTLdFHpH8` · living-room `LqGf5UvHCZ8` · chennai-temple `QXIBCvvA_jc` · home-cleaning, deep-cleaning, popular-deep/maid/home (same bright-home shoots, photo-1758272/1758273 series) ·
bathroom-cleaning `LB3y1u7h61c` · kitchen-cleaning (photo-1791403367484) · maid-services `FhsFUo-Wfc0` · household-assistance `3Fvsn9fKEcM` ·
cooking / popular-cooking (photo-1636647511603 / 1636647511729) · laundry `Q5l8DmNqLn8` · ironing (photo-1732605549016) · plumbing `jaP5ClBdIyU` ·
electrical (photo-1676630656246) · ac-servicing `BsHycOlU6Bg` · other-services `WnuDJlnuOhU` · popular-bathroom `SnKfmC1I9fU`.
