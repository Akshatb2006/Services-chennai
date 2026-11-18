# Mobile apps (React Native)

Two apps share one brand with the website:

- **Customer app** → [`customer-app/`](customer-app/README.md) (Expo, milestone 1: foundation): discover services, view service details, send a request.
- **Professional app** → [`professional-app/`](professional-app/README.md) (Homecare Pro): sign-in, registration, verification state, jobs, schedule, availability, notifications.

The website's "One platform. Two apps." section (`website/src/components/AppShowcase.tsx`)
shows illustrative screens for both, built with the shared tokens. Use them as the visual reference.

## Brand and design tokens

Use **`../design-system/`**. Don't copy values by hand.

Apps import it as `@homecare/design-system` (see `customer-app/tsconfig.json` and `metro.config.js`):

```ts
import { tokens } from "@homecare/design-system";
tokens.color.brand.ink;      // "#171A17"
tokens.color.brand.citrus;   // "#D5F36A"
tokens.radius.lg;            // 18
tokens.type["display-lg"];   // { size: 56, sizeMobile: 34, ... }
```

Component specs, contrast rules and icon/motion guidance: `../design-system/README.md`.
Service catalogue (categories, services, copy, search): `../catalog/` (`@homecare/catalog`), shared with the website. Don't copy it.
The website's only call to action is downloading these apps, so set the store URLs in `../website/src/config/apps.ts` when the listings go live.
