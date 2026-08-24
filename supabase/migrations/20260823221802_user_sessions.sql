-- This app's own record of "fully authenticated" sessions — separate from (and layered on
-- top of) Supabase Auth's own JWT/refresh-token session. A row here is what "Security ->
-- Active sessions" shows and what "log out this device" revokes; requireUser() checks this
-- table (via the bl_session cookie, see lib/auth/cookies.ts) on every request, so revoking a
-- row takes effect immediately rather than waiting for a token to expire. See
-- openspec/changes/add-auth-foundation/design.md.

create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists user_sessions_user_id_idx on public.user_sessions (user_id);

alter table public.user_sessions enable row level security;

-- Users can see and revoke (update revoked_at on) their own sessions. Rows are created by
-- Server Actions using the server-side client, not by the browser client, so no insert
-- policy is needed for regular users.
create policy "select own sessions"
  on public.user_sessions for select
  using (auth.uid() = user_id);

create policy "revoke own sessions"
  on public.user_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
