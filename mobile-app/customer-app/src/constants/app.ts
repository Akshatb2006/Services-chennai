/**
 * App-level constants. Brand values mirror website/src/config/brand.ts and location.ts
 * (placeholder brand name until the client confirms it).
 */
export const app = {
  name: "Homecare",
  city: "Chennai",
  /** Public website for legal pages. Placeholder domain until the real one is set. */
  webUrl: (process.env.EXPO_PUBLIC_WEB_URL || "https://homecare.example.com").replace(/\/$/, ""),
} as const;

export const legalLinks = {
  privacy: `${app.webUrl}/privacy`,
  terms: `${app.webUrl}/terms`,
} as const;
