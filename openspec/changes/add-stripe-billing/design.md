## Context

Builds on `add-auth-foundation` (users, `requireUser()`, RLS conventions, the email/i18n
layers already exist). See `proposal.md` for motivation. Same build-session constraint as the
auth change: no live Stripe/Supabase project to test against — this is reviewable code a
person with both MCPs connected applies and smoke-tests in test mode.

## Goals / Non-Goals

**Goals:**

- Webhook processing that's actually idempotent under Stripe's real retry behavior (which can
  redeliver the same event, and can deliver events out of order).
- A plan-config extension point that doesn't hardcode "exactly two plans" anywhere in the
  Checkout/webhook code, even though only two ship today.
- `requireActiveSubscription()` as trustworthy as `requireUser()`/`requireRole()` — re-derived
  from the database on every call, never cached across requests in a way that could serve a
  stale "active" state after a cancellation.

**Non-Goals:**

- Usage-based/metered billing, add-ons, or proration logic beyond what the Stripe-hosted
  Checkout/Portal already handle — this template's job is the plumbing, not a billing engine.
- Coupons, trials, or tax handling — a downstream project configures those in the Stripe
  Dashboard/Checkout Session options directly; this change doesn't need to model them.

## Decisions

**Idempotency via a unique-constraint INSERT, not a SELECT-then-INSERT check.** A
`processed_stripe_events(event_id primary key, processed_at)` table — the handler always
tries to INSERT the incoming `event.id` first; a primary-key conflict means "already handled,
return 200 and do nothing," success means "proceed." A SELECT-then-INSERT has a race window
where two concurrent deliveries of the same retried event could both pass the SELECT check
before either INSERTs — the constraint-first approach is atomic by construction.
_Alternative considered_: check `subscriptions.updated_at` against the event timestamp
instead — rejected, that only guards against out-of-order updates to the same row, not
literal duplicate delivery, and doesn't generalize to `invoice.*` events that don't touch
`subscriptions` at all.

**`stripe_customer_id` lives on `subscriptions`, one row per user, nullable until first
checkout.** The create-checkout-session action reuses it if present (resubscribing after
cancellation shouldn't create a second Stripe customer); if absent, lets Stripe create one and
the webhook fills the row in on `checkout.session.completed`. A unique index on
`stripe_customer_id` is how `customer.subscription.updated/deleted` (which only carry a Stripe
customer id, not our user id) map back to a row.

**Plan config is a plain object keyed by plan id, reading Price IDs from env vars** —
`STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_BUSINESS` — not hardcoded Price ID strings in
application code, since Price IDs differ between a project's test and live Stripe modes.
Adding a third plan later is one new env var plus one new config entry, not a code change to
Checkout/webhook logic itself.

**`checkout.session.completed` does the initial full sync (fetching the Subscription object
by id from the Stripe API to write status/plan/period-end), `customer.subscription.updated`
handles everything after.** Not handling `customer.subscription.created` separately, even
though Stripe fires it too — `checkout.session.completed` already carries everything needed
for the first write, and the master prompt's explicit minimum event list omits it; adding it
later is additive if a gap shows up in practice.

## Risks / Trade-offs

- [Risk] Webhook handler needs the _raw_ request body for signature verification, which
  Next.js Route Handlers don't give you by default the same way as a plain Node server. →
  Mitigation: read `request.text()` (not `request.json()`) and pass that raw string to
  `stripe.webhooks.constructEvent` — documented explicitly in the route handler's own
  comments so it's never "fixed" into `.json()` by someone chasing a lint/type nit later.
- [Risk] `requireActiveSubscription()` adds a DB read to every gated feature request. →
  Mitigation: same cost class as `requireUser()`'s existing session-row read; acceptable at
  boilerplate scale, revisit with caching only if a real project's usage shows it matters.
- [Risk] Nothing here is verified against a live Stripe/Supabase project. → Mitigation: same
  as `add-auth-foundation` — additive migrations, signature verification and idempotency
  follow documented Stripe patterns; a person with both MCPs connected smoke-tests in test
  mode before relying on it.

## Migration Plan

Additive only — two new tables, no changes to existing ones. No rollback plan needed.
