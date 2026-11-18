import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const zod = fileURLToPath(new URL("./node_modules/zod/index.js", import.meta.url));

export default defineConfig({
  // tsconfig maps `zod` to its type declarations for the shared packages; at runtime use the real module.
  resolve: { tsconfigPaths: true, alias: [{ find: /^zod$/, replacement: zod }] },
  test: {
    globals: true,
    root: "./",
    include: ["test/**/*.e2e-spec.ts"],
    setupFiles: ["./test/setup-env.ts"],
    globalSetup: ["./test/global-setup.ts"],
    // One shared test database: run files one at a time.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
