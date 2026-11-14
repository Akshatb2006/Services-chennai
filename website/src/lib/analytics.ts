import { analytics } from "@/config/analytics";

/**
 * Acquisition events. NOTE: no event represents an install — a store redirect
 * or click is only intent; installs must come from App Store Connect / Play Console.
 */
export type AnalyticsEvent =
  | { name: "download_cta_clicked"; props: { app: string; placement: string } }
  | { name: "store_option_selected"; props: { app: string; platform: string; placement: string; status: string } }
  | { name: "early_access_submitted"; props: { app: string; method: "email" | "phone"; platform: string; placement: string } }
  | { name: "qr_code_scanned"; props: { app: string } }
  | { name: "app_store_redirected"; props: { app: string; platform: string } };

type W = Window & {
  dataLayer?: Record<string, unknown>[];
  gtag?: (...args: unknown[]) => void;
  plausible?: (name: string, opts?: { props: Record<string, unknown> }) => void;
};

export function track<E extends AnalyticsEvent>(name: E["name"], props: E["props"]) {
  if (typeof window === "undefined") return;
  const w = window as W;
  try {
    switch (analytics.provider) {
      case "gtm":
        (w.dataLayer ??= []).push({ event: name, ...props });
        break;
      case "ga4":
        w.gtag?.("event", name, props);
        break;
      case "plausible":
        w.plausible?.(name, { props });
        break;
    }
  } catch {
    /* analytics must never break the UI */
  }
  window.dispatchEvent(new CustomEvent("homecare:analytics", { detail: { name, props } }));
  if (process.env.NODE_ENV !== "production") console.debug("[analytics]", name, props);
}
