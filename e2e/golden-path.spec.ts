import { expect, test } from "@playwright/test";
import {
  createConfirmedTestUser,
  deleteTestUser,
  hasRealStripeTestCredentials,
  hasRealSupabaseCredentials,
} from "./helpers/supabase-admin";

/**
 * The real signup -> subscribe -> manage flow, against a real Supabase project and Stripe
 * test-mode account — not the dummy placeholder credentials vitest.setup.ts uses for unit
 * tests. See docs/environment-variables.md for how to get real ones.
 *
 * Two things this suite deliberately does NOT try to automate through the real UI, and why:
 *
 * 1. Email verification is done via the Supabase Admin API (createConfirmedTestUser), not by
 *    clicking the link in a real email — there's no inbox for this test to read. That's a
 *    legitimate substitute: it's exactly what Supabase does server-side when a real link is
 *    clicked (marks the user's email confirmed), just invoked directly instead of via a
 *    redirect chain through Supabase's own hosted endpoint.
 * 2. The MFA email OTP code CANNOT be substituted the same way — lib/auth/otp.ts stores only
 *    a keyed hash of the code (`hashCode()`), never the plaintext, specifically so a database
 *    read (even with the service role key) can't recover a working code. That's a deliberate
 *    security property, not a gap to work around. So this suite proves the app reaches the
 *    MFA challenge screen correctly (see "reaches the MFA challenge after enabling it" below)
 *    but stops there rather than trying to defeat its own OTP hashing to finish the login.
 *    Completing that step is a manual/real-email check, not an automated one.
 *
 * Both of the above need `SUPABASE_SERVICE_ROLE_KEY` for a real project — the same key the
 * app's own Server Actions use, never exposed to a browser context here either.
 */

const TEST_PASSWORD = "a-long-random-e2e-test-password-1";

test.describe("golden path: signup -> verify -> login -> subscribe -> manage", () => {
  test.skip(
    !hasRealSupabaseCredentials(),
    "Needs a real Supabase project (NEXT_PUBLIC_SUPABASE_URL etc.) — see docs/environment-variables.md",
  );

  let userId: string | undefined;

  test.afterEach(async () => {
    if (userId) {
      await deleteTestUser(userId);
      userId = undefined;
    }
  });

  test("a new user can verify, log in, and land on the dashboard", async ({ page }) => {
    const { email, userId: id } = await createConfirmedTestUser(TEST_PASSWORD);
    userId = id;

    await page.goto("/login");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /log in/i }).click();

    // MFA is off by default for a new profile (see the profiles migration) — a fresh user
    // goes straight to the dashboard, not through /verify-mfa.
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("subscribing and then canceling updates the billing settings screen", async ({ page }) => {
    test.skip(
      !hasRealStripeTestCredentials(),
      "Needs real Stripe test-mode keys (sk_test_...) — see docs/environment-variables.md",
    );

    const { email, userId: id } = await createConfirmedTestUser(TEST_PASSWORD);
    userId = id;

    await page.goto("/login");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/dashboard/settings/billing");
    await page
      .getByRole("button", { name: /subscribe/i })
      .first()
      .click();

    // Stripe's own hosted Checkout page — a different origin. Field ids below are Stripe's
    // own, long-stable ones; if Stripe changes their hosted Checkout markup this is the part
    // that needs updating, not the rest of this test.
    await expect(page).toHaveURL(/checkout\.stripe\.com/);
    const emailField = page.locator("#email");
    if (await emailField.isVisible().catch(() => false)) {
      await emailField.fill(email);
    }
    await page.locator("#cardNumber").fill("4242424242424242");
    await page.locator("#cardExpiry").fill("12/34");
    await page.locator("#cardCvc").fill("123");
    const cardholderName = page.locator("#billingName");
    if (await cardholderName.isVisible().catch(() => false)) {
      await cardholderName.fill("Test User");
    }
    await page.getByRole("button", { name: /subscribe|pay|start trial/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/settings\/billing/, { timeout: 30_000 });
    await expect(page.getByText(/active/i)).toBeVisible();

    await page.getByRole("button", { name: /manage subscription/i }).click();
    await expect(page).toHaveURL(/billing\.stripe\.com/, { timeout: 15_000 });
    await page.getByRole("button", { name: /cancel (plan|subscription)/i }).click();
    // Stripe's portal asks for a confirmation step before actually canceling.
    await page
      .getByRole("button", { name: /cancel/i })
      .last()
      .click();

    await page.goto("/dashboard/settings/billing");
    await expect(page.getByText(/canceled/i)).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("MFA challenge screen", () => {
  test.skip(
    !hasRealSupabaseCredentials(),
    "Needs a real Supabase project (NEXT_PUBLIC_SUPABASE_URL etc.) — see docs/environment-variables.md",
  );

  let userId: string | undefined;

  test.afterEach(async () => {
    if (userId) {
      await deleteTestUser(userId);
      userId = undefined;
    }
  });

  test("enabling MFA and logging in again reaches the code-entry screen", async ({ page }) => {
    const { email, userId: id } = await createConfirmedTestUser(TEST_PASSWORD);
    userId = id;

    await page.goto("/login");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/dashboard/settings/security");
    await page.getByRole("switch").click();
    await expect(page.getByRole("switch")).toBeChecked();

    // Log out (via the account menu) and back in — this time it should stop at /verify-mfa
    // instead of going straight to the dashboard. Completing the code from here needs a real
    // inbox — see this file's header comment for why that's not automated.
    await page.getByRole("button", { name: /account menu/i }).click();
    await page.getByRole("menuitem", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /log in/i }).click();

    await expect(page).toHaveURL(/\/verify-mfa/);
    await expect(page.getByLabel(/6-digit code/i)).toBeVisible();
  });
});
