-- Profiles: one row per auth.users row, created automatically on signup. Carries the RBAC
-- extension point (role) and the MFA toggle. See openspec/changes/add-auth-foundation and
-- .claude/skills/supabase-security/SKILL.md.

create type public.user_role as enum ('owner', 'admin', 'member');

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'owner',
  mfa_enabled boolean not null default false,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "select own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- A user can change their own display name and MFA toggle, but never their own role —
    -- that column only ever changes server-side (service_role), so a compromised client
    -- token can't self-promote. Enforced by re-checking the *new* row's role against the
    -- *current* row's role.
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

-- No insert/delete policy for regular users on purpose: rows are created by the trigger
-- below (as the definer) and removed only via the auth.users cascade.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Server-only helper: loads the caller's role without relying on any client-supplied value.
-- SECURITY DEFINER so it can be called from RLS policies on other tables even though those
-- policies otherwise can't see across tables the caller lacks direct access to.
create or replace function public.current_user_role()
returns public.user_role
language sql
security definer
stable
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;
