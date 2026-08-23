import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireUser, UnauthorizedError } from "@/lib/auth/session";
import { listPlans } from "@/lib/stripe/plans";
import { createClient } from "@/lib/supabase/server";
import { BillingSettingsForm } from "./billing-settings-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Settings.Billing.metadata");
  return { title: t("title") };
}

type BillingSettingsPageProps = {
  searchParams: Promise<{ checkout?: string }>;
};

export default async function BillingSettingsPage({ searchParams }: BillingSettingsPageProps) {
  // requireUser() is the authoritative check (see lib/auth/session.ts): proxy.ts already
  // redirects unauthenticated requests away from /dashboard, but it only checks that the
  // bl_session cookie exists, not that the underlying row hasn't been revoked since — same
  // reasoning as the security settings page.
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      const locale = await getLocale();
      redirect({ href: "/login", locale });
    }
    throw error;
  }

  const supabase = await createClient();
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, plan, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  // Read server-side rather than via useSearchParams() client-side — that hook requires a
  // <Suspense> boundary to avoid a build-time CSR bail-out; an awaited prop needs neither.
  const { checkout } = await searchParams;
  const checkoutResult = checkout === "success" || checkout === "canceled" ? checkout : null;

  return (
    <BillingSettingsForm
      subscription={subscription}
      plans={listPlans()}
      checkoutResult={checkoutResult}
    />
  );
}
