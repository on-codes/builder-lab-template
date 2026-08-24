"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createCheckoutSession } from "@/lib/actions/billing/checkout";
import { createPortalSession } from "@/lib/actions/billing/portal";
import type { PlanId, PlanSummary } from "@/lib/stripe/plans";
import type { Database } from "@/lib/supabase/types";

type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];

type SubscriptionRow = {
  status: SubscriptionStatus | null;
  plan: string | null;
  current_period_end: string | null;
};

type BillingSettingsFormProps = {
  subscription: SubscriptionRow | null;
  plans: PlanSummary[];
  checkoutResult: "success" | "canceled" | null;
};

// Statuses where the stored current_period_end reads as an expiry rather than a future
// renewal — everything else shows "Renews {date}".
const EXPIRING_STATUSES = new Set<SubscriptionStatus>(["canceled", "unpaid", "incomplete_expired"]);

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(iso));
}

export function BillingSettingsForm({
  subscription,
  plans,
  checkoutResult,
}: BillingSettingsFormProps) {
  const t = useTranslations("Settings.Billing");
  const [isPending, startTransition] = useTransition();
  const [pendingPlanId, setPendingPlanId] = useState<PlanId | null>(null);

  useEffect(() => {
    if (checkoutResult === "success") {
      toast.success(t("checkoutSuccessToast"));
    } else if (checkoutResult === "canceled") {
      toast.info(t("checkoutCanceledToast"));
    }
    // Only meant to react once to the result the page loaded with, not to `t` identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutResult]);

  function handleSubscribe(planId: PlanId) {
    setPendingPlanId(planId);
    startTransition(async () => {
      const result = await createCheckoutSession({ planId });
      if (!result.success) {
        toast.error(t("checkoutError"));
        setPendingPlanId(null);
        return;
      }
      window.location.href = result.data.url;
    });
  }

  function handleManage() {
    startTransition(async () => {
      const result = await createPortalSession();
      if (!result.success) {
        toast.error(t("portalError"));
        return;
      }
      window.location.href = result.data.url;
    });
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>

      {subscription ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("currentPlanSectionTitle")}</CardTitle>
            <CardDescription>{t("currentPlanSectionDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">{subscription.plan ?? t("unknownPlan")}</span>
                {subscription.status && (
                  <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                    {t(`status.${subscription.status}`)}
                  </span>
                )}
              </div>
              {subscription.current_period_end && (
                <span className="text-muted-foreground text-xs">
                  {t(
                    subscription.status && EXPIRING_STATUSES.has(subscription.status)
                      ? "endsOn"
                      : "renewsOn",
                    { date: formatDate(subscription.current_period_end) },
                  )}
                </span>
              )}
            </div>
            <Button onClick={handleManage} disabled={isPending} className="self-start">
              {isPending ? t("manageActionLoading") : t("manageAction")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("plansSectionTitle")}</CardTitle>
            <CardDescription>{t("plansSectionDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {plans.map((plan) => (
              <div key={plan.id} className="flex items-center justify-between gap-4">
                <span className="font-medium">{plan.name}</span>
                <Button onClick={() => handleSubscribe(plan.id)} disabled={isPending} size="sm">
                  {isPending && pendingPlanId === plan.id
                    ? t("subscribeActionLoading")
                    : t("subscribeAction")}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
