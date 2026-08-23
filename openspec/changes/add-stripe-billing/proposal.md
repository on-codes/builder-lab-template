## Why

This boilerplate promises subscription billing that already works (CLAUDE.md section 8) — a
cloned project renames/reprices two demo plans instead of building Checkout, the Customer
Portal, and webhook sync from scratch. **For a non-technical project owner**: this adds the
ability to charge a monthly subscription (two tiers, "Pro" and "Business") in Stripe **test
mode** — no real money moves until the person explicitly switches to live keys, which this
change does not do on its own.

## What Changes

- A `subscriptions` table (RLS: a user reads only their own row) that mirrors Stripe's
  subscription state, kept in sync by the webhook handler only.
- Stripe Checkout: a Server Action creates a Checkout Session for a plan identifier
  (`"pro"` | `"business"`), looking up the real Stripe Price ID server-side — never
  constructing an amount from client input.
- Stripe Customer Portal: a Server Action creates a portal session for self-service
  plan changes/cancellation; the Billing settings screen is a single button to it.
- `app/api/webhooks/stripe/route.ts`: signature-verified, idempotent (checks `event.id`
  against a table of already-processed events before acting), handling
  `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`.
  The last two trigger the subscription-receipt / payment-failed email templates.
- `requireActiveSubscription()` — the server-side extension point every future gated
  feature calls, re-derived from the `subscriptions` table, never from a client-supplied
  flag.
- Test-mode Stripe keys by default (`.claude/skills/stripe-billing/SKILL.md` already covers
  the never-go-live-without-explicit-confirmation rule — this change doesn't touch that).

## Capabilities

### New Capabilities

- `billing`: subscription checkout, self-service plan management via the Stripe Customer
  Portal, and webhook-driven sync of subscription state into this app's own database.

### Modified Capabilities

_(none)_

## Impact

- New: `supabase/migrations/*_subscriptions.sql`, `supabase/migrations/*_processed_stripe_events.sql`,
  `lib/stripe/*` (client, plan config, `requireActiveSubscription`), `lib/actions/billing/*`
  (create-checkout-session, create-portal-session), `app/api/webhooks/stripe/route.ts`,
  `app/[locale]/dashboard/settings/billing/page.tsx`, `emails/{subscription-receipt,payment-failed}.tsx`.
- Dependencies added: `stripe` (server SDK).
- No impact on auth — this change assumes `add-auth-foundation` is already in place
  (`requireUser()` is how the checkout/portal actions identify the caller).
