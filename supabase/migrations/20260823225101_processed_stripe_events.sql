-- Webhook idempotency: the handler inserts the incoming Stripe event id here BEFORE acting on
-- it. A primary-key conflict means "already handled" (Stripe redelivered it) — return success
-- and do nothing further. This is deliberately an insert-first check, not select-then-insert,
-- so two concurrent deliveries of the same event can't both pass the check before either
-- writes — see openspec/changes/add-stripe-billing/design.md.

create table if not exists public.processed_stripe_events (
  event_id text primary key,
  processed_at timestamptz not null default now()
);

alter table public.processed_stripe_events enable row level security;

create policy "no direct client access"
  on public.processed_stripe_events for all
  using (false)
  with check (false);
