# Mobile apps (React Native)

Two apps share one brand with the website:

- **Customer app**: discover services, view service details, send a request.
- **Professional app**: today's jobs, job checklist, skills and availability.

The website's "One platform. Two apps." section (`website/src/components/AppShowcase.tsx`)
shows illustrative screens for both, built with the shared tokens. Use them as the visual reference.

## Brand and design tokens

Use **`../design-system/`**. Don't copy values by hand.

```ts
import { tokens } from "../design-system/dist/tokens.js";
tokens.color.brand.ink;      // "#171A17"
tokens.color.brand.citrus;   // "#D5F36A"
tokens.radius.lg;            // 18
tokens.type["display-lg"];   // { size: 56, sizeMobile: 34, ... }
```

Component specs, contrast rules and icon/motion guidance: `../design-system/README.md`.
Business config to mirror (services, categories, city): `../website/src/config/`.
The website's only call to action is downloading these apps, so set the store URLs in `../website/src/config/apps.ts` when the listings go live.
