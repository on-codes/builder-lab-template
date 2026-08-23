-- Email MFA one-time codes. Hashed, expiring, attempt-capped. No client ever reads or writes
-- this table directly — every access goes through a Server Action using the server-side
-- Supabase client, same pattern as rate_limits. See lib/auth/otp.ts and
-- openspec/changes/add-auth-foundation/design.md ("MFA codes are single-use, hashed,
-- expiring rows").

create table if not exists public.mfa_otp_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  max_attempts int not null default 5,
  created_at timestamptz not null default now()
);

create index if not exists mfa_otp_codes_user_id_idx on public.mfa_otp_codes (user_id);

alter table public.mfa_otp_codes enable row level security;

create policy "no direct client access"
  on public.mfa_otp_codes for all
  using (false)
  with check (false);
