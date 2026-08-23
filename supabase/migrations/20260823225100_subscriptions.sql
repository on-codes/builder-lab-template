-- Mirrors Stripe's subscription state for each user. The webhook handler
-- (app/api/webhooks/stripe/route.ts) is the only writer; everything else reads through
-- requireActiveSubscription() (lib/stripe/subscription.ts). See
-- openspec/changes/add-stripe-billing/design.md.

create type public.subscription_status as enum (
  'incomplete',
  'incomplete_expired',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'paused'
);

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status public.subscription_status,
  plan text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "select own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- No insert/update/delete policy for regular users on purpose — only the webhook handler
-- (service_role) ever writes this table. A client-supplied "I'm subscribed" value must never
-- be trustable.

create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row
  execute function public.set_updated_at();
