import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for E2E test setup/teardown only — never imported by app code.
 * Lets tests do things a real user interface deliberately doesn't expose (confirming an
 * email without clicking a real link, deleting a test user afterwards) so the suite doesn't
 * need a real inbox to read from. See e2e/golden-path.spec.ts's header comment for why email
 * confirmation can be done this way but the MFA code deliberately can't.
 */
export function createE2eAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to run e2e tests that need one.",
    );
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

/** True once real (non-placeholder) Supabase credentials are configured for this run. */
export function hasRealSupabaseCredentials(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !!url && !url.includes("example.supabase.co");
}

/** True once real (non-placeholder) Stripe test-mode credentials are configured for this run. */
export function hasRealStripeTestCredentials(): boolean {
  const key = process.env.STRIPE_SECRET_KEY;
  return !!key && key.startsWith("sk_test_") && key !== "sk_test_dummy";
}

function uniqueTestEmail(): string {
  // No Date.now()/Math.random() assumption here beyond what a normal Node test process
  // already allows (unlike Workflow scripts, e2e specs run as plain Node/Playwright, not a
  // workflow script, so both are fine to use).
  return `builderlab-e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

/**
 * Creates a fresh, already-email-confirmed test user directly via the Admin API — equivalent
 * to what happens after a real user clicks the verification link in their email, without this
 * test needing to read a real inbox. Returns the credentials a normal login form submission
 * needs.
 */
export async function createConfirmedTestUser(password: string) {
  const admin = createE2eAdminClient();
  const email = uniqueTestEmail();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`e2e: failed to create test user: ${error?.message}`);
  }

  return { email, password, userId: data.user.id };
}

/** Deletes a test user and its dependent rows (cascades — see the profiles migration). */
export async function deleteTestUser(userId: string) {
  const admin = createE2eAdminClient();
  await admin.auth.admin.deleteUser(userId);
}
