// Plan id -> Stripe Price ID. Reads from env vars (Price IDs differ between test and live
// Stripe modes) rather than hardcoding them, so adding/renaming/repricing a plan is a config
// change, never a code change in the checkout/webhook logic that reads this. See
// openspec/changes/add-stripe-billing/design.md.
export const PLANS = {
  pro: {
    id: "pro",
    priceId: process.env.STRIPE_PRICE_ID_PRO,
    name: "Pro",
  },
  business: {
    id: "business",
    priceId: process.env.STRIPE_PRICE_ID_BUSINESS,
    name: "Business",
  },
} as const;

export type PlanId = keyof typeof PLANS;

export function isPlanId(value: string): value is PlanId {
  return value in PLANS;
}

export function getPriceId(planId: PlanId): string {
  const priceId = PLANS[planId].priceId;
  if (!priceId) {
    throw new Error(`Missing Stripe Price ID env var for plan "${planId}"`);
  }
  return priceId;
}

/** Reverse lookup — used to store a human-readable plan name from a webhook's Price ID. */
export function planIdForPriceId(priceId: string): PlanId | null {
  for (const plan of Object.values(PLANS)) {
    if (plan.priceId === priceId) return plan.id;
  }
  return null;
}

export type PlanSummary = { id: PlanId; name: string };

/**
 * Plan metadata that's safe to send to a Client Component for a plan picker — id and display
 * name only, never the Stripe Price ID (getPriceId() resolves that server-side, inside the
 * Server Action that creates the Checkout Session, from the planId the client actually sent).
 */
export function listPlans(): PlanSummary[] {
  return Object.values(PLANS).map(({ id, name }) => ({ id, name }));
}
