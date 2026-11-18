# @homecare/catalog

The service taxonomy (categories, services, copy, search) shared by `website/` and `mobile-app/*`.
Plain TypeScript with no images and no framework imports. Each consumer attaches its own photos by slug.

| Consumer | How it imports | Photos |
| --- | --- | --- |
| `website/` | `@homecare/catalog` path alias (`tsconfig.json`), `turbopack.root` set to the repo root | `website/src/config/services.ts` |
| `mobile-app/customer-app/` | `@homecare/catalog` path alias; Metro `watchFolders` | `src/features/services/media.ts` |

Edit services **here only**. Prices, ratings and durations go in `meta` once confirmed by the business; UIs render them only when present.
