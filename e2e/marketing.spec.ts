import { expect, test } from "@playwright/test";

// Smoke tests only — no real Supabase/Stripe project needed, safe to run anywhere (including
// against the dummy credentials vitest.setup.ts also uses). They check structure (a heading
// exists, a form field is reachable by its label, an unauthenticated visit redirects) rather
// than exact copy, so they don't need updating every time marketing copy changes. See
// e2e/golden-path.spec.ts for the flows that need real credentials.

test.describe("public marketing pages", () => {
  test("home page loads and links to signup", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /sign up/i }).first()).toBeVisible();
  });

  test("pricing page loads", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

test.describe("auth pages render the expected fields", () => {
  test("login page has email and password fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  });

  test("signup page has email, password, and confirm-password fields", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
  });

  test("forgot-password page has an email field", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });
});

test.describe("route protection (proxy.ts)", () => {
  test("visiting /dashboard while logged out redirects to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("visiting /verify-mfa with no pending challenge redirects to /login", async ({ page }) => {
    await page.goto("/verify-mfa");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("not-found page", () => {
  test("an unmatched route shows the friendly not-found page, not a framework default", async ({
    page,
  }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /go home/i })).toBeVisible();
  });
});
