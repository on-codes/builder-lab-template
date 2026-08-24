"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

type DashboardErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Scoped to everything under app/[locale]/dashboard. Next.js nests error.tsx *between* a
 * layout and its page/children rather than around the whole layout, so this renders inside
 * dashboard/layout.tsx: the header, nav, and user menu stay visible, and only the content area
 * (the layout's <main>, which already supplies the page padding/max-width) is replaced by this
 * fallback — which is why, unlike app/[locale]/error.tsx, there's no extra full-viewport
 * wrapper here. Same rules as that top-level boundary otherwise (Client Component required,
 * next-intl available here, message-only console logging) — see that file for the full
 * explanation. https://nextjs.org/docs/app/api-reference/file-conventions/error
 */
export default function DashboardErrorPage({ error, reset }: DashboardErrorPageProps) {
  const t = useTranslations("Errors.generic");
  const tDashboard = useTranslations("Errors.dashboard");

  useEffect(() => {
    // Message only, never the full error object or error.digest — see app/[locale]/error.tsx
    // for why, and lib/email/send.ts for the codebase-wide convention this follows.
    console.error(error.message);
  }, [error]);

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardFooter className="flex flex-col gap-3">
        <Button onClick={reset} className="w-full">
          {t("retryAction")}
        </Button>
        <Link href="/dashboard" className="text-sm underline underline-offset-4">
          {tDashboard("goToDashboardAction")}
        </Link>
      </CardFooter>
    </Card>
  );
}
