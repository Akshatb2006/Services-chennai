/** Homecare Pro (professional app). Brand name is a placeholder until the client confirms it. */
export const app = {
  name: "Homecare Pro",
  city: "Chennai",
  webUrl: (process.env.EXPO_PUBLIC_WEB_URL || "https://homecare.example.com").replace(/\/$/, ""),
} as const;

export const legalLinks = {
  privacy: `${app.webUrl}/privacy`,
  terms: `${app.webUrl}/terms`,
} as const;
