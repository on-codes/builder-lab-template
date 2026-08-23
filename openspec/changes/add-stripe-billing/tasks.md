## 1. Schema

- [ ] 1.1 Migration: `subscriptions` table (user_id PK, stripe_customer_id unique,
      stripe_subscription_id, status, plan, current_period_end), RLS scoped to the owning user
      for select, no client write access (webhook writes via service role only)
- [ ] 1.2 Migration: `processed_stripe_events` table (event_id PK, processed_at), RLS
      `using (false)` (service-role only)

## 2. Stripe client & plan config

- [ ] 2.1 `lib/stripe/client.ts` — server-only Stripe SDK instance
- [ ] 2.2 `lib/stripe/plans.ts` — plan id -> Price ID config, reading `STRIPE_PRICE_ID_PRO` /
      `STRIPE_PRICE_ID_BUSINESS` from env
- [ ] 2.3 `lib/stripe/subscription.ts` — `requireActiveSubscription()`, re-derived from the
      `subscriptions` table on every call

## 3. Server Actions

- [ ] 3.1 `createCheckoutSession(planId)` — resolves the Price ID server-side, reuses an
      existing Stripe customer id from `subscriptions` if present
- [ ] 3.2 `createPortalSession()` — requires an existing Stripe customer id

## 4. Webhook handler

- [ ] 4.1 `app/api/webhooks/stripe/route.ts` — reads the raw body (`request.text()`, not
      `.json()`), verifies the signature, inserts into `processed_stripe_events` first
      (unique-constraint idempotency, see design.md) before handling
- [ ] 4.2 Handle `checkout.session.completed`, `customer.subscription.updated`,
      `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
- [ ] 4.3 Send `subscription-receipt` / `payment-failed` emails from the invoice events

## 5. Email templates

- [ ] 5.1 `emails/subscription-receipt.tsx`, `emails/payment-failed.tsx` + render-to-string
      tests, following the pattern already established for the auth emails

## 6. Screen

- [ ] 6.1 `app/[locale]/dashboard/settings/billing/page.tsx` — current plan/status, a button
      to `createCheckoutSession` per plan when there's no active subscription, a button to
      `createPortalSession` when there is

## 7. Tests

- [ ] 7.1 Unit tests: plan-id-to-Price-ID resolution (valid + unknown plan), webhook signature
      rejection (invalid/missing signature never reaches event handling)
- [ ] 7.2 Idempotency test: processing the same event id twice only has the side effect once
- [ ] 7.3 `requireActiveSubscription()` tests: active, none, canceled/past-due

## 8. Verification

- [ ] 8.1 `pnpm exec oxlint .`, `pnpm exec oxfmt --check .`, `pnpm typecheck`, `pnpm test` all
      pass
- [ ] 8.2 Every scenario in `specs/billing/spec.md` checked against the finished code
- [ ] 8.3 `.claude/hooks/validate-migration.sh` passes on the new migrations
