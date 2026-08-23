"use server";

import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { requireUser, UnauthorizedError } from "@/lib/auth/session";
import { getPriceId, isPlanId, type PlanId } from "@/lib/stripe/plans";
import { stripe } from "@/lib/stripe/client";
import { createServiceClient } from "@/lib/supabase/service";

const checkoutSchema = z.object({
  planId: z.string().refine(isPlanId, "Unknown plan"),
});

export type CreateCheckoutSessionError = "INVALID_PLAN" | "UNAUTHORIZED" | "UNKNOWN";

/**
 * Creates a Stripe Checkout Session for the given plan, resolving the real Price ID
 * server-side — never accepting a price/amount from the client. Reuses an existing Stripe
 * customer id if this user already has one (e.g. resubscribing after cancellation), so
 * checkout doesn't create a second Stripe customer for the same user.
 */
export async function createCheckoutSession(input: {
  planId: string;
}): Promise<ActionResult<{ url: string }, CreateCheckoutSessionError>> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return fail("INVALID_PLAN");
  }
  const planId: PlanId = parsed.data.planId;

  try {
    const user = await requireUser();
    const service = createServiceClient();

    const { data: existing } = await service
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: getPriceId(planId), quantity: 1 }],
      customer: existing?.stripe_customer_id ?? undefined,
      customer_email: existing?.stripe_customer_id ? undefined : user.email,
      client_reference_id: user.id,
      metadata: { user_id: user.id },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings/billing?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings/billing?checkout=canceled`,
    });

    if (!session.url) {
      return fail("UNKNOWN");
    }
    return ok({ url: session.url });
  } catch (error) {
    if (error instanceof UnauthorizedError) return fail("UNAUTHORIZED");
    console.error("createCheckoutSession failed", error);
    return fail("UNKNOWN");
  }
}
