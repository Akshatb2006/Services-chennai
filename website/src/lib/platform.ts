import type { Platform } from "@/config/apps";

export type DetectedPlatform = Platform | "desktop" | "unknown";

/** Server- and client-safe UA classification. */
export function platformFromUA(ua: string | null | undefined): DetectedPlatform {
  if (!ua) return "unknown";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Windows NT|Macintosh|X11|Linux x86_64|CrOS/i.test(ua)) return "desktop";
  return "unknown";
}

/** Client-only refinement: iPadOS reports a Mac UA but has touch. */
export function detectClientPlatform(): DetectedPlatform {
  const p = platformFromUA(navigator.userAgent);
  if (p === "desktop" && /Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1) return "ios";
  return p;
}
