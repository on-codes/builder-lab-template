import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.metadata");
  return { title: t("title") };
}

export default async function DashboardPage() {
  const t = await getTranslations("Dashboard");

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">{t("welcomeTitle")}</h1>
      <p className="text-muted-foreground max-w-prose text-balance">{t("welcomeDescription")}</p>
    </div>
  );
}
