import "server-only";
import { requireUser } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export class SubscriptionRequiredError extends Error {
  constructor(message = "An active subscription is required") {
    super(message);
    this.name = "SubscriptionRequiredError";
  }
}

/**
 * The extension point every subscription-gated feature calls. Re-derives the status from the
 * database on every call — never trusts a cached value or anything the client claims. Throws
 * SubscriptionRequiredError (rather than returning a boolean) so a caller can't accidentally
 * ignore the result the way an unchecked boolean return invites.
 */
export async function requireActiveSubscription(): Promise<void> {
  const user = await requireUser();
  const service = createServiceClient();

  const { data } = await service
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data?.status || !ACTIVE_STATUSES.has(data.status)) {
    throw new SubscriptionRequiredError();
  }
}

/** Non-throwing variant for UI branches ("show an upgrade prompt" vs. gating an action). */
export async function hasActiveSubscription(): Promise<boolean> {
  try {
    await requireActiveSubscription();
    return true;
  } catch (error) {
    if (error instanceof SubscriptionRequiredError) return false;
    throw error;
  }
}
