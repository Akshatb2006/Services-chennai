# Homecare customer app

React Native (Expo SDK 58, React Native 0.88, New Architecture) customer app for Homecare, Chennai.
Milestone 1 built the foundation (architecture, design system, navigation, components).
Milestone 2 connected the app to the real API in [`../../backend`](../../backend/README.md): phone sign-in, profile, saved addresses and service requests.

## Run it

```bash
# 1. Start the API (see backend/README.md): Postgres + `npm run start:dev` on :4000
# 2. Then:
cd mobile-app/customer-app
npm install
cp .env.example .env          # set EXPO_PUBLIC_API_BASE_URL for your simulator/device

npm start                     # Expo dev server (press i / a / w)
npm run ios                   # iOS simulator (needs Xcode)
npm run android               # Android emulator/device (needs Android Studio / SDK)
npm run web                   # browser preview (react-native-web), handy for quick layout checks

npm run check                 # typecheck + lint + tests
```

The app uses only Expo SDK modules, so it runs in **Expo Go** for quick checks. For release-like testing use a
development build: `npx expo run:ios` / `npx expo run:android` locally, or `npx eas-cli@latest build --profile development`.

## Temporary identifiers (replace before store submission)

| Setting | Value | Where |
| --- | --- | --- |
| Display name | `Homecare` (placeholder brand) | `app.json` → `expo.name` |
| iOS bundle ID | `com.example.homecare.customer` | `app.json` → `expo.ios.bundleIdentifier` |
| Android package | `com.example.homecare.customer` | `app.json` → `expo.android.package` |
| URL scheme | `homecare` | `app.json` → `expo.scheme` |
| Website (legal links) | `https://homecare.example.com` | `EXPO_PUBLIC_WEB_URL` |

Bundle IDs can't be changed after a store listing is published. Pick the final ones before the first upload.

## Environment

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | Homecare API: `http://localhost:4000` (iOS simulator, web), `http://10.0.2.2:4000` (Android emulator), your computer's LAN IP for a physical device. Empty = browse-only. |
| `EXPO_PUBLIC_WEB_URL` | Public website for privacy/terms/help links. |

## Structure

```
src/
  app/                    Expo Router routes only (thin screens)
    _layout.tsx           fonts, QueryClient, root stack, splash hand-off
    (tabs)/               Home · Services · Requests · Profile (custom tab bar)
    services/[serviceId]  service detail (stack)
    request/new           request form (modal)
    onboarding/           first-launch intro (shown once, skippable)
    notifications         empty state
  components/             shared UI: AppText, PrimaryButton/SecondaryButton, IconButton, SearchInput,
                          ServiceCard, CategoryChip, CategoryGrid, SectionHeader, LocationSelector,
                          EmptyState/LoadingState/ErrorState, ScreenContainer, BottomNavigation, Logo,
                          SplashOverlay, icons (deep-imported Lucide icons)
  features/
    services/             photo map, filtering, TanStack Query hooks
    requests/             status definitions, request card, Zod schema, hooks, test-only fixtures
    profile/              session boundary (no auth yet)
  services/
    api/                  env config, fetch client + typed errors, endpoints, QueryClient
    session/              SecureStore token storage
  store/                  Zustand: lightweight local UI state (onboarding flag)
  theme/                  React Native view of the shared design tokens
  types/                  service, request, customer types
  hooks/ utils/ constants/
assets/images/            icon, adaptive icon, splash, service photos (1000px)
__tests__/                Jest + React Native Testing Library + expo-router/testing-library
  support/fake-api.ts     in-memory API implementing the contract (tests only)
```

> Expo Router's current convention keeps routes in `src/app/`, so `app/` lives under `src/` here.
> There is no `app/index.tsx` redirect file: it would clash with `(tabs)/index.tsx` on `/`. The tab layout opens onboarding instead.

## Shared packages (single source of truth)

| Package | Path | Used by |
| --- | --- | --- |
| `@homecare/design-system` | `../../design-system` | Token JSON → `dist/tokens.js`. `src/theme/tokens.ts` only converts units (em → px, line-height ratio → px, shadows → CSS `boxShadow`). |
| `@homecare/catalog` | `../../catalog` | Categories, services, copy and search ranking, shared with the website. Photos are attached per app in `src/features/services/media.ts`. |
| `@homecare/contracts` | `../../contracts` | API contract shared with the backend: Zod schemas, request statuses, phone rules, response types. |

Both are resolved through `tsconfig.json` paths, Metro `watchFolders` (`metro.config.js`) and Jest `moduleNameMapper`.

## Data and state

- **API client** (`src/services/api/client.ts`): the only place that calls `fetch`. It unwraps `{ data }` and turns `{ error }` into `ApiError` (code, message, field errors, retry-after). On a 401 it refreshes the access token once and retries, sharing a single refresh between concurrent requests.
- **Session** (`src/store/session.ts`, Zustand):
  - The access token is kept in memory only.
  - The refresh token is kept in SecureStore (Keychain/Keystore, this device only) and rotated on every refresh.
  - The session is restored at launch.
  - A rejected refresh signs you out.
  - Logout revokes the session on the server.
- **Server state:** TanStack Query hooks per feature (`features/*/hooks.ts`): profile, addresses, requests (paginated), request history and notifications. Screens never call the API directly.
- **Validation:** forms use the same Zod schemas as the API (`@homecare/contracts`), so client and server rules can't drift.
- **Catalogue:** bundled from `@homecare/catalog` (the backend serves the same data at `/services`).
- **Business rule:** a sent request shows as **Under review** with "isn't a confirmed booking yet". Only staff can confirm it (next milestone).
- Prices, ratings and durations render only when `meta` is set in the catalogue. None are set today.

## Customer journey

**Sign-in** (`/sign-in`, a modal):
1. Enter a mobile number and receive a code by SMS (in development, the code is printed in the API terminal).
2. Enter the code (autofill supported).
3. First sign-in only: add your name.

**After sign-in:**
- **Profile:** edit your name/email, manage saved addresses (add, edit, delete, set default) and log out.
- **New request:** choose a service, a saved address, a date (next 14 days) and a time, then describe what you need and send.
- **Requests:** a paginated list, then a detail screen with status, history and cancellation (while pending or confirmed).

## Builds (EAS)

`eas.json` defines three profiles, and `app.config.ts` derives the variant from `app.json`:

| Profile | Installs as | API URL |
| --- | --- | --- |
| `development` | "Homecare (Dev)", `<id>.dev` (dev client) | From your local `.env`, via `npx expo start` |
| `preview` | "Homecare (Preview)", `<id>.preview` (internal; Android APK) | EAS environment `preview` |
| `production` | `app.json` identity (store) | EAS environment `production` |

Production builds refuse to run while:
- the identifiers are `com.example.*`
- the API URL isn't `https://`
- the website is still `example.com`

The EAS project hasn't been created yet: the account owner runs `npx eas-cli@latest init` here once. See
[`docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md`](../../docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md) §6 for the exact
commands. Nothing has been built on EAS or published.

## Known limitations

- Native builds have **not** been run on a simulator or device in this milestone, because there was no Xcode or Android SDK on the build machine. Verified: the iOS, Android and web bundles all compile (`expo export`), `expo-doctor` passes 20/20 checks, the Jest suites pass, and every screen was reviewed in the web preview at 390×844.
- Sending real SMS needs an SMS provider (see backend/README.md). Until then, development builds use the API's console codes.
- Push notifications aren't set up; notifications are in-app only (pull to refresh).
- On web (dev preview only), the session isn't persisted across reloads, because SecureStore is native-only.
- `userInterfaceStyle` is `light`. Dark mode isn't designed yet.
