import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    // Run tests sequentially to avoid DB conflicts.
    // sequence.concurrent only serializes tests WITHIN a file;
    // fileParallelism: false is what actually stops test FILES from
    // running in parallel workers — without it, each file's afterAll
    // cleanupOrphanedTestData() deletes other files' in-flight
    // @test.local users, causing random cross-file failures.
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
