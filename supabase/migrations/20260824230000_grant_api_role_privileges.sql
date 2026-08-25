-- Grant the Supabase API roles the table/function privileges they need.
--
-- Why this is needed: a Postgres GRANT and a Row Level Security policy are two independent
-- gates, and a query has to pass BOTH. Every table in this template enables RLS and ships
-- policies, but the API roles (anon / authenticated / service_role) were left holding only
-- REFERENCES, TRIGGER and TRUNCATE on them — no SELECT/INSERT/UPDATE/DELETE. On a stock
-- Supabase project ALTER DEFAULT PRIVILEGES hands those out automatically for tables created
-- in `public`; on this project that didn't happen, so every table created by a migration was
-- unreadable by the app even though its policies were correct.
--
-- The symptom was a service_role query returning Postgres error 42501 ("permission denied for
-- table profiles"). Because lib/actions/auth/log-in.ts discards the PostgrestError and only
-- checks whether a row came back, that surfaced as "logIn: no profile row for authenticated
-- user <id>" and a generic "Something went wrong" on the login screen — indistinguishable
-- from a genuinely missing row. lib/rate-limit.ts fails open, so the matching failure on
-- increment_rate_limit() degraded silently to "rate limit check failed" instead of erroring.
--
-- Security: this does NOT widen what a user can see. RLS stays the real gate, exactly as in
-- Supabase's own default setup — anon/authenticated still only reach rows their policies
-- allow, and the three internal tables (rate_limits, mfa_otp_codes, processed_stripe_events)
-- keep their `using (false)` policies, so a grant there still yields zero rows. service_role
-- bypasses RLS by design and is only ever used server-side (lib/supabase/service.ts).
--
-- Safe per .claude/skills/safe-migrations/SKILL.md: GRANT only adds privileges. Nothing is
-- dropped, altered or rewritten, and re-running it is a no-op.

grant usage on schema public to anon, authenticated, service_role;

-- Existing tables. DML only — deliberately not `grant all`, which would also hand out
-- TRUNCATE (a destructive privilege no API role in this app has any reason to hold).
grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;

-- Sequences, so INSERTs into tables with generated keys can advance them.
grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;

-- Functions called over the API, e.g. public.increment_rate_limit() via supabase.rpc()
-- in lib/rate-limit.ts.
grant execute on all functions in schema public
  to anon, authenticated, service_role;

-- The same privileges for anything a FUTURE migration creates, so this problem cannot
-- silently come back the next time a table is added.
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;

alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;

alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
