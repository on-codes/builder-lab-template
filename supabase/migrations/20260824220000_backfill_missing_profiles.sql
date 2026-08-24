-- Backfill: create a profiles row for any auth.users row that doesn't have one.
--
-- Why this is needed: public.handle_new_user() (20260823221800_profiles_and_roles.sql) is an
-- AFTER INSERT trigger on auth.users, so it only ever fires for signups that happen *after*
-- that migration is applied. Any account created before then — e.g. while testing against a
-- project whose migrations hadn't been pushed yet — authenticates fine (auth.users is
-- Supabase's own built-in table) but then fails every code path that reads public.profiles,
-- surfacing as "logIn: no profile row for authenticated user <id>" and a generic UNKNOWN
-- error on the login screen (lib/actions/auth/log-in.ts).
--
-- Safe by the rules in .claude/skills/safe-migrations/SKILL.md: this only INSERTs rows that
-- are missing. It never updates or deletes an existing row — `on conflict do nothing` means
-- re-running it is a no-op, and any profile that already exists keeps its current role and
-- mfa_enabled values untouched.
--
-- New rows take the table's own column defaults (role = 'owner', mfa_enabled = false), which
-- is exactly what the trigger would have inserted.

insert into public.profiles (id)
select u.id
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
