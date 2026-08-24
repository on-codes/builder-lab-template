## Why

This boilerplate's entire value is that a cloned project never has to build auth again. Right
now there is no schema and no auth flow at all — every downstream feature (billing, the
dashboard, RBAC-gated screens) depends on this existing first, correctly, once. **For a
non-technical project owner**: this adds the ability for their users to create an account,
log in, recover a forgotten password, and optionally require a 6-digit emailed code as a
second factor — nothing about their existing data or costs changes, since there isn't any yet.

## What Changes

- New Supabase schema: `profiles` (with a `role` enum: `owner`/`admin`/`member`),
  `mfa_otp_codes` (hashed, expiring, attempt-capped), reuse of the existing `rate_limits`
  table for auth-endpoint throttling. All new tables ship with RLS enabled in the same
  migration that creates them.
- New Supabase Auth wiring: `@supabase/ssr` browser/server/service-role clients,
  `proxy.ts` (Next.js 16's route-protection file) refreshing the session and redirecting
  unauthenticated users away from `(dashboard)` and authenticated users away from `(auth)`.
- New custom shadcn UI screens under `(auth)/`: login, signup, forgot-password,
  reset-password, verify-mfa — never Supabase's default UI.
- New Server Actions: signup (with email verification required before first login), login
  (redirects to MFA challenge when enabled), forgot/reset password (single-use, expiring
  token, identical response whether or not the email exists), MFA enable/verify/resend,
  session listing + revoke.
- `requireUser()` / `requireRole()` server-only helpers — the extension point every future
  feature gates on, and the thing every Server Action calls for itself, since `proxy.ts` does
  not run in front of Server Actions.
- Password policy: minimum length/complexity plus a breached-password check via an
  established library (no hand-rolled blocklist).
- Rate limiting on login, signup, forgot-password, and resend-OTP, keyed by IP for anonymous
  requests and by user for authenticated ones.

## Capabilities

### New Capabilities

- `authentication`: account creation, login, password recovery, email MFA, session
  management, and the RBAC extension point every other feature in this boilerplate builds on.

### Modified Capabilities

_(none — this is the first capability in the project)_

## Impact

- New: `supabase/migrations/*` (profiles/roles, mfa_otp_codes), `lib/supabase/{client,server}.ts`,
  `lib/auth/*` (requireUser/requireRole, password policy, rate-limit keys), `proxy.ts`,
  `app/(auth)/**`, `app/(dashboard)/layout.tsx` (shell only — screens land in a later change).
- Removed: `stacks/web/**` (the old "copy these reference files during /setup" flow is retired
  now that the boilerplate ships fully built — see CLAUDE.md section 0) and the placeholder
  `supabase/migrations/00000000000002_example_projects_table.sql` (explicitly marked in its
  own header comment as a reference example to delete).
- Dependencies added: `@supabase/ssr`, `@supabase/supabase-js`, a breached-password-check
  library, `react-hook-form` + `@hookform/resolvers` (form + Zod wiring for five screens).
- No impact on billing/subscriptions — that's a separate, later change
  (`add-stripe-billing`), deliberately kept out of this one's scope.
