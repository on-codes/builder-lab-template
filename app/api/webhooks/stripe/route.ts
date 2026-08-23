import type Stripe from "stripe";
import { NextResponse } from "next/server";
import PaymentFailedEmail, * as paymentFailedTemplate from "@/emails/payment-failed";
import SubscriptionReceiptEmail, * as subscriptionReceiptTemplate from "@/emails/subscription-receipt";
import { routing } from "@/i18n/routing";
import { sendEmail } from "@/lib/email/send";
import { planIdForPriceId } from "@/lib/stripe/plans";
import { stripe } from "@/lib/stripe/client";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/lib/supabase/types";

// Stripe webhooks are Route Handlers, not Server Actions — CLAUDE.md/GUARDRAILS.md still
// apply (signature verification is non-negotiable, see .claude/skills/stripe-billing/SKILL.md).
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Signature verification needs the exact raw bytes Stripe signed — request.text(), never
  // request.json() (which re-serializes and would invalidate the signature check). Do not
  // "simplify" this to .json() later; see openspec/changes/add-stripe-billing/design.md.
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (error) {
    // Never log the raw error here: Stripe.errors.StripeSignatureVerificationError carries
    // the full raw request body as its own `.payload` property (by design, so callers can
    // inspect it) — logging the error object wholesale would print that payload, which for a
    // real Stripe event can embed customer email/billing details, into server logs on every
    // failed/forged signature attempt. Stripe's own `.message` for this failure is always a
    // fixed, generic string, never the payload — safe (and sufficient) to log on its own.
    console.error(
      "Stripe webhook signature verification failed",
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const service = createServiceClient();

  // Idempotency: insert the event id BEFORE acting on it. A unique-constraint conflict means
  // this exact event was already processed (Stripe redelivers) — succeed without redoing the
  // side effect. Insert-first (not select-then-insert) closes the race window between two
  // concurrent deliveries of the same event — see design.md.
  const { error: insertError } = await service
    .from("processed_stripe_events")
    .insert({ event_id: event.id });

  if (insertError) {
    if (insertError.code === "23505") {
      // unique_violation — already processed.
      return NextResponse.json({ received: true, duplicate: true });
    }
    // Log only the message, not the raw PostgrestError object.
    console.error("Failed to record processed Stripe event", insertError.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;
      default:
        // Unhandled event types are expected — Stripe sends far more event types than this
        // app acts on. Not an error.
        break;
    }
  } catch (error) {
    // Never log a raw error here: this catch can see a Stripe error (e.g. from
    // subscriptions.retrieve — StripeError.message/.raw is Stripe's own API response text,
    // which can echo request values back) or a sendEmail() failure (whose contract is "never
    // log to/subject/html", see lib/email/send.ts, since the emails sent from this handler
    // carry billing amounts and a customer-facing invoice URL). Log only non-value-bearing
    // identifiers/messages, matching the same standard applied throughout the auth and
    // billing action files.
    console.error(
      `Stripe webhook handler failed for ${event.type}`,
      error instanceof Stripe.errors.StripeError
        ? { type: error.type, code: error.code, requestId: error.requestId }
        : error instanceof Error
          ? error.message
          : String(error),
    );
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id ?? session.metadata?.user_id;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  if (!userId || !customerId || !subscriptionId) {
    console.error("checkout.session.completed missing user/customer/subscription id", {
      hasUserId: !!userId,
      hasCustomerId: !!customerId,
      hasSubscriptionId: !!subscriptionId,
    });
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await upsertSubscription(userId, customerId, subscription);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = await lookupUserIdByCustomerId(subscription.customer);
  if (!userId) return;
  await upsertSubscription(userId, subscriptionCustomerId(subscription), subscription);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = await lookupUserIdByCustomerId(subscription.customer);
  if (!userId) return;
  await upsertSubscription(userId, subscriptionCustomerId(subscription), subscription);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const userId = await lookupUserIdByCustomerId(invoice.customer);
  if (!userId) return;

  const email = await lookupUserEmail(userId);
  if (!email) return;

  await sendEmail(
    { default: SubscriptionReceiptEmail, subject: subscriptionReceiptTemplate.subject },
    {
      amount: invoice.amount_paid,
      currency: invoice.currency,
      invoiceUrl: invoice.hosted_invoice_url ?? undefined,
      locale: routing.defaultLocale,
    },
    email,
    { userId },
  );
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const userId = await lookupUserIdByCustomerId(invoice.customer);
  if (!userId) return;

  const email = await lookupUserEmail(userId);
  if (!email) return;

  await sendEmail(
    { default: PaymentFailedEmail, subject: paymentFailedTemplate.subject },
    {
      billingPortalUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings/billing`,
      locale: routing.defaultLocale,
    },
    email,
    { userId },
  );
}

function subscriptionCustomerId(subscription: Stripe.Subscription): string {
  return typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;
}

const KNOWN_SUBSCRIPTION_STATUSES: readonly Database["public"]["Enums"]["subscription_status"][] = [
  "incomplete",
  "incomplete_expired",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "paused",
];

/**
 * Stripe's SDK types `Subscription.status` as `Status | OtherString` — a forward-compatibility
 * escape hatch for status values this SDK version doesn't know about yet (see stripe-node's
 * response-type conventions). Postgres's `subscription_status` enum is closed, so writing an
 * unrecognized value would fail the insert — narrow to `null` and log instead of letting that
 * surface as an opaque database error. If this ever logs, Stripe added a new status: add it to
 * both this list and the `subscription_status` enum (a new additive migration, never an
 * ALTER on the existing type — see .claude/skills/safe-migrations/SKILL.md).
 */
function toDbSubscriptionStatus(
  status: string,
): Database["public"]["Enums"]["subscription_status"] | null {
  if ((KNOWN_SUBSCRIPTION_STATUSES as readonly string[]).includes(status)) {
    return status as Database["public"]["Enums"]["subscription_status"];
  }
  console.error("Unknown Stripe subscription status", status);
  return null;
}

async function upsertSubscription(
  userId: string,
  customerId: string,
  subscription: Stripe.Subscription,
) {
  const service = createServiceClient();
  const item = subscription.items.data[0];
  const priceId = item?.price.id;

  const { error } = await service.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status: toDbSubscriptionStatus(subscription.status),
      plan: priceId ? (planIdForPriceId(priceId) ?? priceId) : null,
      current_period_end: item?.current_period_end
        ? new Date(item.current_period_end * 1000).toISOString()
        : null,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    // Log only the message, not the raw PostgrestError object.
    console.error("Failed to upsert subscription", error.message);
  }
}

async function lookupUserIdByCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): Promise<string | null> {
  const customerId = typeof customer === "string" ? customer : customer?.id;
  if (!customerId) return null;

  const service = createServiceClient();
  const { data } = await service
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!data) {
    console.error("No subscription row for Stripe customer", customerId);
    return null;
  }
  return data.user_id;
}

async function lookupUserEmail(userId: string): Promise<string | null> {
  const service = createServiceClient();
  const { data } = await service.auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}
