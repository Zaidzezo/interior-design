import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: {
    alias: {
      "@core": new URL("./packages/core/src", import.meta.url).pathname,
    },
  },
  test: { include: ["tests/**/*.test.ts"], exclude: ["tests/e2e/**"] },
});
