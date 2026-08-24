## 1. Routing skeleton (i18n-ready from the start)

- [ ] 1.1 `next-intl` installed and wired: `i18n/routing.ts`, `i18n/navigation.ts`,
      `i18n/request.ts`, plugin registered in `next.config.ts`, `messages/en.json` started
- [ ] 1.2 Move `app/page.tsx`/`app/layout.tsx` under `app/[locale]/`; root `app/layout.tsx`
      reduced to the minimal wrapper Next.js requires
- [ ] 1.3 `proxy.ts` created (Next.js 16 naming) combining next-intl's routing middleware with
      Supabase session refresh and `(dashboard)`/`(auth)` redirect rules

## 2. Schema (additive, RLS from creation)

- [ ] 2.1 Migration: `profiles` table (`role` enum: owner/admin/member) + `handle_new_user()`
      trigger on `auth.users` insert, defaulting new accounts to `owner`
- [ ] 2.2 Migration: `mfa_otp_codes` table, RLS `using (false)` (service-role/Server-Action
      only, same pattern as the existing `rate_limits` table)
- [ ] 2.3 Migration: `user_sessions` table (user_agent, created_at, last_seen_at, revoked_at),
      RLS scoped to the owning user for select, no client insert/update/delete
- [ ] 2.4 Remove the placeholder `00000000000002_example_projects_table.sql` and retire
      `stacks/web/**` (superseded by the real code this change adds)

## 3. Supabase clients & core helpers

- [ ] 3.1 `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (SSR, async cookies),
      `lib/supabase/service.ts` (service-role, server-only)
- [ ] 3.2 `lib/auth/session.ts`: `requireUser()`, `requireRole()`, session-revocation check
      against `user_sessions`
- [ ] 3.3 `lib/auth/password.ts`: strength check + breached-password check (fail-open), Zod
      schema for the password field reused by signup/reset forms
- [ ] 3.4 `lib/auth/otp.ts`: generate/hash/verify MFA codes against `mfa_otp_codes`

## 4. Server Actions

- [ ] 4.1 `signUp` — enumeration-safe response, sends verification email
- [ ] 4.2 `logIn` — enumeration-safe response, branches to MFA challenge when enabled
- [ ] 4.3 `verifyMfaCode`, `resendMfaCode` — rate-limited, attempt-capped
- [ ] 4.4 `requestPasswordReset`, `resetPassword` — enumeration-safe, single-use/expiring token
- [ ] 4.5 `listSessions`, `revokeSession` — scoped to the caller's own rows only
- [ ] 4.6 `enableMfa`, `disableMfa` (Security settings)
- [ ] 4.7 Rate limiting applied to every action in this group per `app-security` skill's
      IP/user-id convention

## 5. Screens (custom shadcn UI, never Supabase's default UI)

- [ ] 5.1 `(auth)/login`, `(auth)/signup`, `(auth)/forgot-password`, `(auth)/reset-password`,
      `(auth)/verify-mfa`
- [ ] 5.2 `(dashboard)/layout.tsx` shell (sidebar/topbar, sign-out) — feature content is out of
      scope for this change
- [ ] 5.3 `(dashboard)/settings/security` — session list/revoke, MFA enable/disable

## 6. Tests

- [ ] 6.1 Unit tests: password policy (weak/breached/fail-open), OTP hashing/expiry/attempt
      cap, `requireRole` ignoring client-supplied values
- [ ] 6.2 Server Action tests: happy path + rejected/unauthorized for each action in group 4
- [ ] 6.3 RLS test: a second user cannot read another user's `profiles`/`user_sessions` rows

## 7. Verification

- [ ] 7.1 `pnpm exec oxlint .`, `pnpm exec oxfmt --check .`, `pnpm typecheck`, `pnpm test` all
      pass
- [ ] 7.2 Every scenario in `specs/authentication/spec.md` checked against the finished code
- [ ] 7.3 `.claude/hooks/validate-migration.sh` passes on the new migrations
