import path from "node:path";
import type { NextConfig } from "next";

// The repo root, so Turbopack can compile the shared catalogue in ../catalog.
const repoRoot = path.join(__dirname, "..");

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  outputFileTracingRoot: repoRoot,
  turbopack: {
    root: repoRoot,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
