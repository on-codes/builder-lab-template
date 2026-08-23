"use server";

import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { requireUser, UnauthorizedError } from "@/lib/auth/session";
import { stripe } from "@/lib/stripe/client";
import { createServiceClient } from "@/lib/supabase/service";

export type CreatePortalSessionError = "NO_CUSTOMER" | "UNAUTHORIZED" | "UNKNOWN";

/** Creates a Stripe Customer Portal session for self-service plan changes/cancellation. */
export async function createPortalSession(): Promise<
  ActionResult<{ url: string }, CreatePortalSessionError>
> {
  try {
    const user = await requireUser();
    const service = createServiceClient();

    const { data } = await service
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!data?.stripe_customer_id) {
      return fail("NO_CUSTOMER");
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings/billing`,
    });

    return ok({ url: session.url });
  } catch (error) {
    if (error instanceof UnauthorizedError) return fail("UNAUTHORIZED");
    console.error("createPortalSession failed", error);
    return fail("UNKNOWN");
  }
}
