---
name: supabase-security
description: Use this skill any time you create, modify, or review a Supabase table, policy, auth flow, or any code that reads/writes user data. Covers RLS, auth, cookies/sessions, and service_role key handling for both the Next.js (web) and React Native/Expo (mobile) tracks.
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

### Web (Next.js)
- Use `@supabase/ssr` with three clients: browser client, server client (Server
  Components/Actions), and middleware client.
- Session lives in httpOnly cookies managed by `@supabase/ssr` — never read/write the token
  manually, never put it in `localStorage`.
- Refresh the session in `middleware.ts` on every request so Server Components always see a
  valid session.

### Mobile (Expo)
- Use `@supabase/supabase-js` with `expo-secure-store` as the storage adapter (never
  `AsyncStorage` alone for tokens — it isn't encrypted).
- Deep-link based OAuth/magic-link redirects go through `expo-linking`.

## service_role key

- The `service_role` key bypasses RLS entirely. It is only ever used in:
  - Next.js Route Handlers / Server Actions that run server-side, or
  - Supabase Edge Functions.
- It must never appear in any file that ships to the browser or the mobile bundle, and never
  in a client component. Grep for `service_role` before every commit as part of the secret
  scan (`.claude/hooks/check-secrets.sh`).

## Checklist before marking a Supabase feature "done"

- [ ] RLS enabled on every new/changed table
- [ ] A policy exists for every operation the app performs (select/insert/update/delete)
- [ ] No `service_role` key reachable from client code
- [ ] Auth checked with `auth.uid()`, never trusting a `user_id` passed from the client
- [ ] At least one test exercises the policy (a request as User A must not see/modify User B's
      row) — see `.claude/skills/testing/SKILL.md`
