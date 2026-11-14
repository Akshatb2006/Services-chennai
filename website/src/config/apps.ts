import { brand } from "./brand";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  APP ACQUISITION CONFIG — single source of truth for both apps.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Publishing a store listing (no code changes needed elsewhere):
 *    Set the real listing URL — either in the deployment environment
 *    (preferred) or directly in the fallback strings below:
 *
 *      NEXT_PUBLIC_CUSTOMER_IOS_URL      https://apps.apple.com/in/app/<name>/id<APP_ID>
 *      NEXT_PUBLIC_CUSTOMER_ANDROID_URL  https://play.google.com/store/apps/details?id=<package>
 *      NEXT_PUBLIC_PRO_IOS_URL
 *      NEXT_PUBLIC_PRO_ANDROID_URL
 *
 *  With a real https store URL a platform is "published". Without one, launch mode decides:
 *  live → active badge to the store homepage (placeholder); prelaunch → "coming soon" (no link).
 *  iOS and Android are independent: publish one without the other.
 *
 *  DO NOT put guessed or example store URLs here.
 */

export type Platform = "ios" | "android";
export type AppId = "customer" | "professional";

export type StoreListing = {
  platform: Platform;
  status: "published" | "coming_soon";
  /** Only set when published. */
  url: string | null;
  /** true when live mode is using the store homepage because the real listing URL isn't set yet */
  placeholder: boolean;
};

/**
 * LAUNCH MODE
 *  "live"      (default) — the apps are presented as available: "Get the app" everywhere,
 *              active download badges, direct store redirects, no early-access form.
 *              Until a real listing URL is set, a badge links to that store's homepage
 *              (placeholder) — replace with the real listing URLs before going public.
 *  "prelaunch" — "Get early access" form + "Coming soon" badges for any platform without
 *              a real listing URL. Set NEXT_PUBLIC_APP_LAUNCH_MODE=prelaunch to use it.
 */
export const launchMode: "live" | "prelaunch" = process.env.NEXT_PUBLIC_APP_LAUNCH_MODE === "prelaunch" ? "prelaunch" : "live";

const STORE_HOMEPAGES: Record<Platform, string> = {
  ios: "https://apps.apple.com/in/",
  android: "https://play.google.com/store/apps",
};

export type AppConfig = {
  id: AppId;
  name: string;
  audience: string;
  stores: Record<Platform, StoreListing>;
  /** Early-access registration (used while any store is unpublished). */
  earlyAccess: { enabled: boolean; endpoint: string };
  /** Stable, store-agnostic URL used by buttons (and any printed links). */
  getAppPath: string;
  /**
   * Deep links into the installed app (set once the apps define them).
   * scheme: e.g. "homecare://"; universalLink: e.g. "https://homecare.example.com/app"
   */
  deepLink: { scheme: string | null; universalLink: string | null };
};

const STORE_HOSTS: Record<Platform, RegExp> = {
  ios: /^https:\/\/apps\.apple\.com\/.+\/id\d+/,
  android: /^https:\/\/play\.google\.com\/store\/apps\/details\?id=[\w.]+/,
};

function listing(platform: Platform, raw: string | undefined): StoreListing {
  const url = raw?.trim() ?? "";
  if (STORE_HOSTS[platform].test(url)) return { platform, status: "published", url, placeholder: false };
  if (launchMode === "live") return { platform, status: "published", url: STORE_HOMEPAGES[platform], placeholder: true };
  return { platform, status: "coming_soon", url: null, placeholder: false };
}

// NOTE: process.env.NEXT_PUBLIC_* must be referenced literally so Next.js can inline them.
export const apps: Record<AppId, AppConfig> = {
  customer: {
    id: "customer",
    name: brand.displayName,
    audience: "Customers",
    stores: {
      ios: listing("ios", process.env.NEXT_PUBLIC_CUSTOMER_IOS_URL ?? ""),
      android: listing("android", process.env.NEXT_PUBLIC_CUSTOMER_ANDROID_URL ?? ""),
    },
    earlyAccess: { enabled: true, endpoint: "/api/early-access" },
    getAppPath: "/get-app",
    deepLink: { scheme: null, universalLink: null },
  },
  professional: {
    id: "professional",
    name: `${brand.displayName} Pro`,
    audience: "Professionals",
    stores: {
      ios: listing("ios", process.env.NEXT_PUBLIC_PRO_IOS_URL ?? ""),
      android: listing("android", process.env.NEXT_PUBLIC_PRO_ANDROID_URL ?? ""),
    },
    earlyAccess: { enabled: true, endpoint: "/api/early-access" },
    getAppPath: "/get-app?app=professional",
    deepLink: { scheme: null, universalLink: null },
  },
};

export const PLATFORMS: Platform[] = ["ios", "android"];
export const platformLabel: Record<Platform, { store: string; device: string }> = {
  ios: { store: "App Store", device: "iPhone" },
  android: { store: "Google Play", device: "Android" },
};

export const isPublished = (app: AppId, p: Platform) => apps[app].stores[p].status === "published";
export const anyPublished = (app: AppId) => PLATFORMS.some((p) => isPublished(app, p));
export const allPublished = (app: AppId) => PLATFORMS.every((p) => isPublished(app, p));
export const storeUrl = (app: AppId, p: Platform) => apps[app].stores[p].url;

/** Primary CTA label follows publication state. */
export const ctaLabel = (app: AppId) => (anyPublished(app) ? "Get the app" : "Get early access");

