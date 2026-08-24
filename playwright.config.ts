import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

// See docs/architecture.md "Testing strategy" for the split between e2e/*.spec.ts (smoke
// tests — no real backend needed, safe to run anywhere) and e2e/golden-path.spec.ts (the full
// signup -> subscribe flow, which needs a real Supabase project + Stripe test-mode keys and
// is skipped automatically when those aren't configured — see that file's own header comment).
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Unset everywhere except a sandboxed Claude Code execution environment that ships
        // its own pre-installed Chromium at a fixed path instead of the one `playwright
        // install` would normally fetch — see this repo's own environment notes. A real
        // clone/CI run leaves this unset and Playwright manages its browser normally.
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : undefined,
      },
    },
  ],
  webServer: {
    // `next dev`, not `next start` — this template's E2E suite is meant to be runnable
    // without a separate build step first (CI runs its own dedicated build job regardless;
    // see .github/workflows/ci.yml). Turbopack compiles each route on first hit, which is why
    // the timeout below is generous.
    command: `pnpm exec next dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
