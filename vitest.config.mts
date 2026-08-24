import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    // Node, not jsdom, by default: most of this repo's tests are Server Actions and plain
    // lib/ logic, not component rendering. Component tests that actually need a DOM opt in
    // per-file with a `// @vitest-environment jsdom` pragma comment at the top of the file.
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    exclude: ["node_modules", ".next", "e2e", "stacks"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["lib/**", "app/api/**", "app/actions/**"],
      exclude: ["**/*.d.ts", "**/*.test.{ts,tsx}"],
      // Coverage target for this boilerplate is 70%+ on lib/ and app/api/ (see
      // docs/decisions and Section 8 of the build spec) — measured and reported
      // in CI, not enforced as a hard gate here, since a boilerplate's coverage
      // shifts as features get added on top of it in downstream projects.
    },
  },
});
