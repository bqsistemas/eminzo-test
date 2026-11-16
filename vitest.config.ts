import { defineConfig } from "vitest/config";

// Explicit include globs: the main checkout holds job worktrees under .worktrees/, and the
// tests must never walk into them.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    environment: "node",
    testTimeout: 30_000,
  },
});
