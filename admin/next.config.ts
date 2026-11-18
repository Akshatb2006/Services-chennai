import path from "node:path";
import type { NextConfig } from "next";

// Repo root, so Turbopack can compile the shared packages (../contracts, ../catalog).
const repoRoot = path.join(__dirname, "..");

// A production deployment must call the real API over HTTPS. Without this check a missing variable would
// silently fall back to http://localhost:4000 (src/lib/api.ts) and ship a dashboard that can't sign in.
// Only Vercel production builds are checked; local, CI and preview builds keep the localhost default.
if (process.env.VERCEL_ENV === "production" && !/^https:\/\/[^/]+$/.test(process.env.NEXT_PUBLIC_API_BASE_URL ?? "")) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL must be set to the API's https:// origin (no path or trailing slash) for production builds.");
}

const nextConfig: NextConfig = {
  outputFileTracingRoot: repoRoot,
  poweredByHeader: false,
  turbopack: {
    root: repoRoot,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    // Internal tool: never indexed, never framed.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
