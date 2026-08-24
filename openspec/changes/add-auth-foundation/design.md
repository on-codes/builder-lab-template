## Context

Greenfield: no schema, no auth, exists yet. This is the first capability in the project, so
every decision here becomes the pattern every later change (billing, features) follows. See
`proposal.md` for motivation. Constraints from `.claude/CLAUDE.md`: Next.js 16 (`proxy.ts`,
async cookies/params, no sync compat), Supabase-only backend, RLS-first, additive-only
migrations, i18n from day one, no MCP access to a live Supabase/Vercel project from this build
session (network policy) — schema and clients are built and reasoned about as code, not
verified against a live hosted project.

## Goals / Non-Goals

**Goals:**

- A session model that's genuinely enforced (revocation actually blocks access), not
  decorative.
- An MFA design that doesn't trust the client at any step.
- A route/folder structure that doesn't need a disruptive rewrite when i18n (next change)
  lands.
- Every piece independently testable without a live Supabase project (pure functions where
  possible; Server Actions structured so their logic isn't entangled with the Next.js request
  lifecycle).

**Non-Goals:**

- Multi-user organizations/teams. `profiles.role` is a real extension point (see Decisions)
  but this change ships single-owner accounts only — no invites, no shared workspaces.
- TOTP/authenticator-app MFA. Master prompt is explicit: email OTP only.
- The actual `(dashboard)` feature screens beyond the shell — those come from whatever the
  cloned project adds on top.
- Wiring this up against a live Supabase project (no MCP access in this build environment) —
  migrations and clients are correct, reviewable code; a person with a connected Supabase MCP
  applies them for real.

## Decisions

**`app/[locale]/...` route structure from the start, not retrofitted.** The i18n skill
(`.claude/skills/i18n/SKILL.md`) already commits to next-intl's `[locale]` dynamic segment.
Restructuring routes after screens exist is exactly the kind of rework a boilerplate should
never make a downstream project repeat, so the auth screens in this change are built directly
under `app/[locale]/(auth)/...` with `next-intl`'s routing/middleware wired in as part of this
change, not deferred. What genuinely is deferred to the i18n change: filling out the full
message catalog beyond what auth needs, and any locale-switcher UI.

**Session revocation is app-level, layered on top of Supabase Auth JWTs, not dependent on a
specific Supabase Admin API surface.** Supabase issues and refreshes the actual session JWTs;
this template additionally writes one `user_sessions` row per login (user_agent, created_at,
last_seen_at, revoked_at) so "list active sessions" has something real to show and "revoke"
has a real effect: `requireUser()` (called by every Server Action and by `proxy.ts`) checks the
current session's row isn't revoked, on every request, in addition to the Supabase JWT being
valid. Revoking is instant at the app layer regardless of JWT expiry. _Alternative considered_:
rely solely on Supabase's own session/refresh-token invalidation — rejected because the exact
admin-API surface for "sign out this one other session" varies by supabase-js version and
isn't something to guess at without a live project to verify against; the app-level check is a
guarantee this template controls end to end.

**MFA codes are single-use, hashed, expiring rows — never compared to a plaintext code.**
`mfa_otp_codes(user_id, code_hash, expires_at, attempts, created_at)`, RLS `using (false)` (no
direct client access at all, same pattern as the existing `rate_limits` table) — every
read/write goes through a Server Action using the server-side client. Verifying hashes the
submitted code and compares; a code is consumed (deleted) on success or once `attempts` hits
the cap, whichever first. _Alternative considered_: Supabase Auth's own MFA factor APIs —
those are built around TOTP/phone, not email OTP, so this template implements its own
second-factor step rather than forcing email OTP through an API shaped for a different factor
type.

**RBAC ships as a real column + a real helper, scoped to single-owner accounts today.**
`profiles.role` (`owner` | `admin` | `member`), one profile per user, created by a Postgres
trigger on `auth.users` insert (`handle_new_user()`), defaulting to `owner` — every account is
its own owner until a future change adds shared/team accounts. `requireRole(role)` loads the
role from the database inside the Server Action itself; it never trusts a client-supplied
value or a cached JWT claim. _Alternative considered_: skip the role column until teams
actually exist — rejected per `CLAUDE.md` section 9 and the master prompt: retrofitting a
roles column after real user data exists is exactly the kind of migration
`safe-migrations` would rather this template avoid needing.

**Password policy: real complexity rules + a real breached-password check, fail-open on the
network call.** Minimum length/complexity via a maintained strength-estimation library
(zxcvbn-family), and a k-anonymity breached-password check (Have I Been Pwned's Pwned
Passwords range API — no full wordlist to bundle, no API key). If the breach-check network
call fails or times out, signup proceeds rather than blocking on an unrelated outage — a
missed breach check on a rare failure is a smaller risk than "signups are down because a
third-party API hiccuped." Logged server-side either way so Claude can see how often the
fallback triggers.

**Rate limiting reuses the existing `rate_limits` table/function, keyed per
`.claude/skills/app-security/SKILL.md`'s existing convention** — IP for anonymous endpoints
(signup, login, forgot-password, resend-OTP), `user_id` once authenticated. Forgot-password is
deliberately _not_ keyed by the submitted email — keying an anonymous endpoint's rate limit by
attacker-supplied identity would itself be a timing/enumeration side-channel.

## Risks / Trade-offs

- [Risk] App-level session revocation adds a DB read to every authenticated request. →
  Mitigation: single indexed lookup (`user_sessions` primary key), same cost class as the
  session-refresh check `proxy.ts` already does every request.
- [Risk] HIBP dependency is an external network call on the signup/reset-password path. →
  Mitigation: fail-open with a short timeout, never block on it.
- [Risk] Supabase's own session cookie is established immediately on password verification
  (via the standard `@supabase/ssr` flow), even when MFA is still pending — so for the
  ~10-minute pending window, a client that queries Supabase directly (bypassing this app's
  own Server Actions) could read whatever RLS allows for that user directly, without having
  completed MFA. → Mitigation: accepted for v1, scope is narrow — this only matters for
  someone who already has the correct password (MFA's whole purpose is defense past that
  point) and only exposes what RLS already allows a browser client to read directly, which by
  this template's own convention should be low-sensitivity (this app's Server Actions, which
  DO enforce the full `bl_session` gate, are the intended path for anything sensitive). A more
  complete fix — verify the password with a throwaway, non-cookie-persisting client, and only
  call `setSession()` on the real SSR client once MFA (or its absence) is fully resolved — is
  a reasonable follow-up change, not a blocker for this one.
- [Risk] Single-owner-account RBAC is a real extension point but not exercised by anything in
  this change (`admin`/`member` have no distinct behavior yet). → Mitigation: accepted — the
  cost of the column now is near zero; the cost of adding it after real accounts exist is a
  breaking migration this template exists to avoid.
- [Risk] Nothing here is verified against a live Supabase project (no MCP access in this
  build session). → Mitigation: migrations follow the additive/RLS conventions already proven
  in `rate_limits`/`projects`; a person with Supabase connected applies and smoke-tests before
  relying on it in production, same as any other unreviewed-in-production code.

## Migration Plan

Additive only, per `.claude/skills/safe-migrations/SKILL.md` — new tables, one trigger, no
changes to anything pre-existing. No rollback plan needed for a purely additive change; if a
table needs to change shape later, that's a new column, not an edit to these migrations.

## Open Questions

- Exact breached-password library/package name and its bundle-size trade-off — resolved at
  implementation time against what's actually installable, doesn't change the design.
- Whether `user_sessions.user_agent` needs parsing into a friendly device label ("Chrome on
  macOS") for the Security settings screen, or a raw string is enough for v1 — a display
  detail, not a schema or security decision.
