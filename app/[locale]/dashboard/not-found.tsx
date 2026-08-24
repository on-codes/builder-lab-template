import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("NotFound.metadata");
  return { title: t("title") };
}

/**
 * Scoped to everything under app/[locale]/dashboard (e.g. /dashboard/settings/nonexistent).
 * Next.js nests not-found.tsx *between* a layout and its page/children rather than around the
 * whole layout, so this renders inside dashboard/layout.tsx: the header, nav, and user menu
 * stay visible, and only the content area (the layout's <main>, which already supplies the
 * page padding/max-width) is replaced by this fallback — which is why, unlike
 * app/[locale]/not-found.tsx, there's no outer full-viewport wrapper here. Mirrors
 * dashboard/error.tsx's Card treatment for a consistent look between "something went wrong"
 * and "that page doesn't exist" inside the dashboard; simplified to one action since there's
 * nothing to retry for a 404.
 */
export default async function DashboardNotFound() {
  const t = await getTranslations("NotFound");
  const tDashboard = await getTranslations("NotFound.dashboard");

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href="/dashboard">{tDashboard("goToDashboardAction")}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
