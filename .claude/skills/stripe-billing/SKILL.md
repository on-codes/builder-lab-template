---
name: stripe-billing
description: Use this skill whenever you set up or modify Stripe checkout, subscriptions, webhooks, or any payment-related code. Keeps scope minimal and safe for non-technical founders handling real money.
---

# Stripe — minimum necessary surface

Only implement what's needed to charge for the product being built. Don't build a generic
billing platform.

## Keys & modes

- Default to **test mode** keys (`sk_test_...` / `pk_test_...`) for the whole workshop.
- Never switch a project to live keys without the person explicitly saying they're ready to
  charge real customers. When they do, confirm out loud which key you're about to set and
  where (Vercel env var name), then let them paste the live secret key themselves — you never
  need to see or type it.
- Store the secret key only as a server-side env var (`STRIPE_SECRET_KEY`), never expose it to
  the client. The publishable key (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) is the only Stripe
  value allowed in client code.

## Checkout / payments

- Use Stripe Checkout or Stripe Elements for collecting payment details. The application code
  never touches raw card numbers, CVV, or expiry — that's the entire point of using Stripe.
- Create the Checkout Session / PaymentIntent server-side (Route Handler / Server Action /
  Edge Function), never construct amounts or prices from client-supplied values — look up the
  price from your own product/price table or Stripe Price IDs.

## Webhooks

- Every webhook endpoint verifies the signature:
  ```ts
  const event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  ```
- Never process a webhook payload that failed signature verification.
- Keep the webhook handler idempotent (Stripe retries on failure) — check `event.id` against a
  table of already-processed event ids before acting.

## Data handling

- Never log or store full card numbers, CVV, or Stripe API secret keys — not even in debug
  logs.
- Store only what's needed for support/reconciliation: `stripe_customer_id`,
  `stripe_subscription_id`, `status`, amounts, currency.

## Checklist before marking Stripe integration "done"

- [ ] Only test keys used, unless the person explicitly confirmed going live
- [ ] Secret key is server-only; publishable key is the only client-facing value
- [ ] Webhook signature verified, handler idempotent
- [ ] No sensitive card data touches the app's own database or logs
