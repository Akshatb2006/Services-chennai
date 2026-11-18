/**
 * React Native view of the shared Homecare design tokens.
 *
 * Source of truth: design-system/tokens/*.json → design-system/dist/tokens.js.
 * Nothing here defines a new value; it only converts web units (em, unitless line-height,
 * CSS shadows) into React Native style numbers. Edit the JSON, run
 * `node design-system/scripts/build.mjs`, and both the website and the app update.
 */
import { tokens } from "@homecare/design-system";
import type { TextStyle } from "react-native";

const c = tokens.color;

export const colors = {
  ink: c.brand.ink,
  inkRaised: c.brand["ink-raised"],
  citrus: c.brand.citrus,
  citrusPressed: c.brand["citrus-hover"],
  accentInk: c.brand["accent-ink"],
  olive: c.brand.olive,
  stone: c.brand.stone,
  porcelain: c.surface.porcelain,
  card: c.surface.card,
  white: c.text.inverse,
  text: c.text.primary,
  textSecondary: c.text.secondary,
  textOnAccent: c.text["on-accent"],
  textInverse: c.text.inverse,
  textInverseSecondary: c.text["inverse-secondary"],
  border: c.border.default,
  borderStrong: c.border.strong,
  borderInverse: c.border.inverse,
  success: c.feedback.success,
  error: c.feedback.error,
} as const;

export type ColorName = keyof typeof colors;

/** 4px grid: space[4] === 16 */
export const space = tokens.space;
export const radius = tokens.radius;
export const layout = {
  gutter: tokens.layout["gutter-mobile"],
  touchTarget: tokens.layout["touch-target-min"],
} as const;

export const size = {
  controlLg: tokens.size["control-lg"],
  controlMd: tokens.size["control-md"],
  controlSm: tokens.size["control-sm"],
  iconSm: tokens.size["icon-sm"],
  iconMd: tokens.size["icon-md"],
  iconLg: tokens.size["icon-lg"],
  tabBar: tokens.size["tab-bar"],
  cardImageRatio: tokens.size["card-image-ratio"],
} as const;

export const state = {
  pressedScale: tokens.state["pressed-scale"],
  pressedOverlay: tokens.state["pressed-overlay"],
  disabledOpacity: tokens.state["disabled-opacity"],
} as const;

export const motion = {
  fast: tokens.motion.duration.fast,
  base: tokens.motion.duration.base,
  slow: tokens.motion.duration.slow,
  easing: tokens.motion.easing.standard as unknown as [number, number, number, number],
} as const;

/** Manrope static cuts loaded in the root layout (one family name per weight works on every platform). */
export const fontFamily = {
  400: "Manrope_400Regular",
  500: "Manrope_500Medium",
  600: "Manrope_600SemiBold",
  700: "Manrope_700Bold",
} as const;
type Weight = keyof typeof fontFamily;

export type TypeVariant = keyof typeof tokens.type;

/** Converts a token type style to RN: px line-height, px letter-spacing, mobile display sizes. */
function toTextStyle(name: TypeVariant): TextStyle {
  const t = tokens.type[name] as { size: number; sizeMobile?: number; lineHeight: number; letterSpacing: number; weight: number };
  const fontSize = t.sizeMobile ?? t.size;
  return {
    fontFamily: fontFamily[t.weight as Weight],
    fontSize,
    lineHeight: Math.round(fontSize * Math.max(t.lineHeight, 1.1)),
    letterSpacing: +(fontSize * t.letterSpacing).toFixed(2),
  };
}

export const type = Object.fromEntries(
  (Object.keys(tokens.type) as TypeVariant[]).map((k) => [k, toTextStyle(k)]),
) as Record<TypeVariant, TextStyle>;

const shadowCss = (s: { offsetX: number; offsetY: number; blur: number; spread: number; color: string }) =>
  `${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.spread}px ${s.color}`;

/** CSS box-shadow strings — supported natively by React Native's New Architecture. */
export const shadow = {
  card: shadowCss(tokens.shadow.card),
  raised: shadowCss(tokens.shadow.raised),
  overlay: shadowCss(tokens.shadow.overlay),
} as const;
