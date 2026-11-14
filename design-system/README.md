# HOMECARE design system

One brand across the **website** and the **React Native customer and professional apps**.
The brand name is a placeholder. The visual system is final unless the tokens change.

```
design-system/
  tokens/            ← SOURCE OF TRUTH (W3C design-token JSON, framework-independent)
    colors.json  typography.json  spacing.json  radii.json  shadows.json  motion.json
  scripts/build.mjs  ← generates every platform output below
  dist/
    tokens.json      resolved values, no metadata (any platform)
    tokens.js/.d.ts  ESM object + types (React Native / any JS)
    tokens.css       CSS custom properties (any web stack)
```

The website's Tailwind theme (`website/src/styles/tokens.css`) is generated from the same JSON.

```bash
node design-system/scripts/build.mjs   # after editing any tokens/*.json
```

Never hard-code a colour, radius or font size in either codebase. Change the JSON and rebuild.

---

## Colour

| Token | Hex | Use |
|---|---|---|
| `brand.ink` | `#171A17` | Carbon Ink. Text, dark sections, primary dark buttons, app headers |
| `brand.citrus` | `#D5F36A` | Electric Citrus. **Signature accent.** Primary CTA fill, selected state, highlights |
| `surface.porcelain` | `#F5F3EC` | Page and screen background |
| `surface.card` | `#FFFFFF` | Cards, sheets, inputs |
| `brand.stone` | `#E8E5DA` | Warm Stone. Icon tiles, chips, placeholders |
| `brand.olive` | `#92988A` | Soft Olive. Decorative details; text **only on ink** |
| `text.secondary` | `#5A5F54` | Secondary text (AA on porcelain, white and stone) |
| `border.default` / `strong` | `#E2DFD4` / `#CFCBBE` | Dividers / input borders |

### Contrast rules (WCAG AA, verified)

- Ink on porcelain: **15.8:1**. Ink on citrus: **14.1:1**. Citrus on ink: **14.1:1**.
- **Citrus is never text on light surfaces** (1.1:1). On light, citrus is only a *fill*, with ink content on top.
- **Olive is never text on light surfaces** (2.7:1). Use `text.secondary` instead.
- Focus ring: 2px ink outline plus a 2px citrus inner ring. It's visible on both light and dark.

### Accent discipline

Citrus appears in a few places per screen at most: the primary action, the selected tab or chip, and small highlight dots or badges.
The website uses one full-citrus surface, the final call to action. Everything else is ink, porcelain, white and stone.

## Typography

**Manrope** only (Google Fonts, variable; in React Native use `@expo-google-fonts/manrope` or bundle the TTFs).

| Style | Web | Mobile | Weight | Tracking |
|---|---|---|---|---|
| display-xl | 84 | 44 | 600 | −0.045em |
| display-lg | 56 | 34 | 600 | −0.04em |
| display-md | 40 | 28 | 600 | −0.035em |
| heading-lg / md / sm | 28 / 20 / 16 | same | 600 | −0.03 … −0.01em |
| body-lg / md / sm | 18 / 15 / 13 | same | 400 | 0 |
| label, button | 13 / 15 | same | 600 | 0 |

- Headings use 600. Don't use 700+ except in the wordmark.
- **No uppercase micro-labels.** Labels are sentence case.
- In React Native, `letterSpacing` is in points: `size × em` (e.g. 34 × −0.04 = −1.36).

## Spacing, radii, elevation

- 4pt grid: `space.1`=4 … `space.32`=128. Minimum touch target is **44pt**.
- Radii: `xs 6` · `sm 10` (inputs, small tiles) · `md 14` · `lg 18` (cards, images) · `xl 24` (large media, sheets) · `pill` (buttons, chips).
- Prefer borders and surface colour over shadows. `shadow.raised` is for floating elements only, and `shadow.overlay` is for menus and sheets.

## Components (identical on web and mobile)

| Component | Spec |
|---|---|
| **Primary button** | citrus fill, ink label 15/600, pill, height 52 (lg) / 44 (md), pressed = `citrus-hover` and scale 0.98 |
| **Dark button** | ink fill, white label, leading icon tinted citrus |
| **Store badges** | App Store + Google Play pair; ink fill on light, outline on ink; radius `md`, 48–56 high |
| **Outline button** | 1px `border.strong` on light (white/25% on ink), transparent fill |
| **Chip / filter** | pill, 40–44 high; idle = white + `border.strong`; selected = **citrus fill**, ink text, ink count badge with citrus number |
| **Input** | white, 1px `border.strong`, radius pill (search) or `sm` (forms); focus = ink border + 2px citrus ring |
| **Service card** | white, 1px `border.default`, radius `lg`; image **4:3** on top; title 14–15/600 + arrow; one short `tagline` (13, secondary); optional meta row (rating · duration · from-price) shown only when real data exists; "Enquire" pill (stone → citrus on hover/press) |
| **List card** | white, 1px `border.default`, radius `md`, 12–16 padding |
| **Tab bar (apps)** | white, top border; active item = citrus pill behind the icon, ink label |
| **Icons** | Lucide, 24 grid, **1.75 stroke**, round caps. Inside stone tiles on light, white or citrus on ink |

## Motion

- Easing `cubic-bezier(0.22, 1, 0.36, 1)` everywhere, with no springs or bounce.
- Durations: 150 (press/hover), 300 (menus/toggles), 600 (reveals).
- Respect reduced-motion settings (`prefers-reduced-motion` / `AccessibilityInfo.isReduceMotionEnabled`).
- No continuously running animations.

## Photography

Bright, natural daylight in real homes, using a consistent set of shoots. One photo per service. Never reuse a photo in two places on the same screen. No illustrations or cartoons. All photos are from Unsplash (free licence). Sources are listed in `website/README.md`.
