---
name: supabase-security
description: Use this skill any time you create, modify, or review a Supabase table, policy, auth flow, or any code that reads/writes user data. Covers RLS, auth, cookies/sessions, and service_role key handling for the Next.js web dashboard.
---

# Supabase Security

## RLS — non-negotiable

Every table that stores anything tied to a user gets Row Level Security **enabled in the same
migration that creates it**:

```sql
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "Users can view their own projects"
  on public.projects for select
  using (auth.uid() = owner_id);

create policy "Users can insert their own projects"
  on public.projects for insert
  with check (auth.uid() = owner_id);

create policy "Users can update their own projects"
  on public.projects for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete their own projects"
  on public.projects for delete
  using (auth.uid() = owner_id);
```

Never ship a table with RLS disabled "temporarily to test faster." If a table genuinely needs
to be public-read (e.g. a catalog), still enable RLS and add an explicit `using (true)`
select policy — that documents the decision instead of leaving the table wide open by
omission.

## Auth & sessions

- Use `@supabase/ssr` with three clients: browser client, server client (Server
  Components/Actions), and proxy client.
- Session lives in httpOnly cookies managed by `@supabase/ssr` — never read/write the token
  manually, never put it in `localStorage`.
- Refresh the session in `proxy.ts` (Next.js 16's route-protection file — the `middleware.ts`
  name is deprecated, see `.claude/CLAUDE.md` section 1.1) on every request so Server
  Components always see a valid session.
- `proxy.ts` redirects unauthenticated users away from `(dashboard)` and authenticated users
  away from `(auth)` — but it does **not** run in front of Server Actions the way page routes
  assume. Every Server Action re-derives the user itself
  (`const user = await requireUser()` or equivalent) rather than trusting that a page-level
  redirect already handled it; the same goes for role checks (`requireRole("admin")`) — see
  the RBAC section below.

## MFA (email OTP)

- MFA state is a column on the user's profile (`mfa_enabled boolean`), not a separate
  Supabase Auth "factor" API — this template implements MFA as a second Supabase Auth
  password-grant-like step of its own: after password login, if `mfa_enabled` is true, issue
  a short-lived, single-use 6-digit code, store its hash (never the raw code) with an
  expiry (5–10 minutes) and an attempt counter, email it (`.claude/skills/email-templates/SKILL.md`),
  and only mint the real session once the correct code is submitted before expiry and before
  the attempt cap is hit.
- Never trust a client-supplied "MFA passed" flag — the session is only created server-side,
  after verifying the code against the stored hash.
- Rate-limit code resend the same way as any other auth endpoint (`.claude/skills/app-security/SKILL.md`).

## RBAC

- A `role` column (enum: `owner` / `admin` / `member`) lives on the profile/membership table.
  `requireRole(role)` is a server-only helper that loads the current user's role from the
  database (never from a client-supplied value or a JWT claim the client could have cached
  stale) and throws/redirects if it doesn't match.
- Even if a project only ever ships one role in practice, keep the column and the helper —
  it's the extension point future features gate on, and retrofitting a roles table after
  data exists is real migration work `.claude/skills/safe-migrations/SKILL.md` would rather
  avoid.

## service_role key

- The `service_role` key bypasses RLS entirely. It is only ever used in:
  - Next.js Route Handlers / Server Actions that run server-side, or
  - Supabase Edge Functions.
- It must never appear in any file that ships to the browser, and never in a client component. Grep for `service_role` before every commit as part of the secret
  scan (`.claude/hooks/check-secrets.sh`).

## Checklist before marking a Supabase feature "done"

- [ ] RLS enabled on every new/changed table
- [ ] A policy exists for every operation the app performs (select/insert/update/delete)
- [ ] No `service_role` key reachable from client code
- [ ] Auth checked with `auth.uid()`, never trusting a `user_id` passed from the client
- [ ] At least one test exercises the policy (a request as User A must not see/modify User B's
      row) — see `.claude/skills/testing/SKILL.md`
- [ ] Any auth-touching Server Action re-checks the user/role itself, not just relying on
      `proxy.ts`
- [ ] MFA codes are stored hashed, expire, and are rate-limited/attempt-capped if this change
      touches the MFA flow
