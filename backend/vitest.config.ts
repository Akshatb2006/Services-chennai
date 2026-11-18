import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const zod = fileURLToPath(new URL("./node_modules/zod/index.js", import.meta.url));

export default defineConfig({
  resolve: { tsconfigPaths: true, alias: [{ find: /^zod$/, replacement: zod }] },
  test: {
    globals: true,
    root: "./",
    include: ["src/**/*.spec.ts"],
  },
});
