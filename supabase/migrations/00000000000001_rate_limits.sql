-- Rate limiting table + function, used by lib/rate-limit.ts (web) and by the Edge Functions.
-- Purely additive: it can be copied as-is into any new project based on this template.

create table if not exists public.rate_limits (
  key text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);

alter table public.rate_limits enable row level security;

-- Only the backend (service_role) touches this table; no client has direct access.
create policy "no direct client access"
  on public.rate_limits for all
  using (false)
  with check (false);

create or replace function public.increment_rate_limit(p_key text, p_window_seconds int)
returns table (count int)
language plpgsql
security definer
as $$
begin
  insert into public.rate_limits (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
    set count = case
          when public.rate_limits.window_start < now() - (p_window_seconds || ' seconds')::interval
            then 1
          else public.rate_limits.count + 1
        end,
        window_start = case
          when public.rate_limits.window_start < now() - (p_window_seconds || ' seconds')::interval
            then now()
          else public.rate_limits.window_start
        end
  returning public.rate_limits.count into count;

  return next;
end;
$$;
