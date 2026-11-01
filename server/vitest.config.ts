import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/disposable-guard.ts"],
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
  },
});
