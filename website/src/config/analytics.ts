/**
 * Analytics provider for acquisition events.
 * "none"      → events are only dispatched as a DOM CustomEvent ("homecare:analytics") + dev console.
 * "gtm"       → window.dataLayer.push({ event, ...props })
 * "ga4"       → window.gtag("event", name, props)
 * "plausible" → window.plausible(name, { props })
 * Add the provider's script tag in app/layout.tsx when enabling one.
 */
export const analytics = {
  provider: (process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER ?? "none") as "none" | "gtm" | "ga4" | "plausible",
};
