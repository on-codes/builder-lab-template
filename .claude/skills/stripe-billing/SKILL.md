---
name: stripe-billing
description: Use this skill any time you touch checkout, subscriptions, the Stripe webhook handler, pricing/plan config, or any payment-related code. Stripe subscription billing ships built into this template by default — this skill covers how to keep it correct and safe, not whether to add it.
---

# Stripe — built in, keep it minimal and safe

Every clone of this template already has working subscription billing wired up: Stripe
Checkout with two demo tiers ("Pro" and "Business"), the Customer Portal for self-service plan
changes/cancellation, and a webhook handler that keeps Supabase's `subscriptions` table in
sync. A new project on top of this template almost never needs to build billing from scratch —
it needs to **rename/reprice the existing tiers**, or leave them as-is.

The Stripe MCP is connected by default (`.mcp.json`) — use it to read real Stripe state
(products, prices, customers, events) instead of guessing, the same way the Supabase and
Vercel MCPs are used for their own systems.

## Keys & modes

- Default to **test mode** keys (`sk_test_...` / `pk_test_...`) for everything, always — this
  never changes just because billing is "built in" now.
- Never switch a project to live keys without the person explicitly saying, out loud, that
  they're ready to charge real customers. When they do, confirm out loud which key you're
  about to set and where (Vercel env var name), then let them paste the live secret key
  themselves — Claude never needs to see or type it.
- Store the secret key only as a server-side env var (`STRIPE_SECRET_KEY`), never expose it to
  the client. The publishable key (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) is the only Stripe
  value allowed in client code.

## Checkout

- Use Stripe Checkout for collecting payment details. The application code never touches raw
  card numbers, CVV, or expiry — that's the entire point of using Stripe.
- Create the Checkout Session server-side (Server Action / Route Handler), never construct
  amounts or prices from client-supplied values — look up the Stripe Price ID from your own
  plan config, keyed by a plan identifier the client sends (`"pro"`, `"business"`), never a
  raw amount.
- Success/cancel URLs redirect back into `(dashboard)`, not to a third-party page.

## Customer Portal

- `stripe.billingPortal.sessions.create` for self-service plan changes/cancellation — don't
  hand-build a cancel/upgrade UI; the Portal already handles proration, invoices, and payment
  method updates correctly.
- The portal entry point lives at `(dashboard)/settings/billing` — a single button that
  creates a portal session server-side and redirects.

## Webhooks

- Every webhook endpoint (`app/api/webhooks/stripe/route.ts`) verifies the signature:
  ```ts
  const event = stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!,
  );
  ```
- Never process a webhook payload that failed signature verification.
- Handle, at minimum: `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`.
- Keep the handler idempotent — Stripe retries on failure, and can send the same event more
  than once. Check `event.id` against a table of already-processed event ids before acting;
  if it's already there, return 200 without redoing the side effect.
- On `invoice.payment_succeeded` / `invoice.payment_failed`, send the matching email template
  (`.claude/skills/email-templates/SKILL.md`) — receipt or payment-failed notice.

## Syncing to Supabase

- `subscriptions` table (RLS: a user can only read their own row) mirrors Stripe's
  subscription state: `stripe_customer_id`, `stripe_subscription_id`, `status`, `plan`,
  `current_period_end`, etc. The webhook handler is the only writer.
- `requireActiveSubscription()` is the server-side helper every gated feature calls — never
  gate a feature by checking `localStorage`, a client-passed flag, or anything not re-derived
  from this table on the server.

## Data handling

- Never log or store full card numbers, CVV, or Stripe API secret keys — not even in debug
  logs.
- Store only what's needed for support/reconciliation: customer/subscription ids, status,
  plan, amounts, currency — never raw payment method details.

## Changing the demo plans for a new project

- Renaming "Pro"/"Business" or changing prices: update the Stripe Products/Prices (via MCP,
  test mode) and the plan config that maps a plan identifier to a Price ID. This is a normal,
  low-risk edit — no confirmation needed beyond the usual review.
- Going to one tier instead of two, or adding a third: same — low-risk, just make sure the
  Checkout/webhook code doesn't hardcode "exactly two plans" anywhere.
- Anything that touches **live** price IDs, or removes billing entirely from a project that
  already has paying customers: confirm with the person first (`.claude/GUARDRAILS.md`).

## Checklist before marking Stripe-touching work "done"

- [ ] Only test keys used, unless the person explicitly confirmed going live
- [ ] Secret key is server-only; publishable key is the only client-facing value
- [ ] Webhook signature verified, handler idempotent
- [ ] `subscriptions` table stays in sync and RLS-scoped to the owning user
- [ ] No sensitive card data touches the app's own database or logs
