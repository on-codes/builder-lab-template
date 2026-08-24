import { CreditCardIcon, GlobeIcon, LayoutDashboardIcon, ShieldCheckIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

// Order matches the feature keys under Marketing.Home.features in messages/en.json.
const FEATURES = [
  { key: "auth", icon: ShieldCheckIcon },
  { key: "billing", icon: CreditCardIcon },
  { key: "dashboard", icon: LayoutDashboardIcon },
  { key: "i18n", icon: GlobeIcon },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Marketing.Home.metadata");
  return { title: t("title") };
}

export default async function MarketingHomePage() {
  const t = await getTranslations("Marketing.Home");

  return (
    <div className="flex flex-col gap-20 py-16 md:gap-28 md:py-24">
      <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 text-center md:px-6">
        <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-5xl">
          {t("heroTitle")}
        </h1>
        <p className="text-muted-foreground max-w-xl text-lg text-balance">{t("heroSubtitle")}</p>
        <Button size="lg" asChild>
          <Link href="/signup">{t("heroCta")}</Link>
        </Button>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 md:px-6">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-2 text-center">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {t("featuresSectionTitle")}
          </h2>
          <p className="text-muted-foreground text-balance">{t("featuresSectionDescription")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ key, icon: Icon }) => (
            <Card key={key}>
              <CardHeader>
                <Icon className="text-muted-foreground size-6" aria-hidden="true" />
                <CardTitle>{t(`features.${key}.title`)}</CardTitle>
                <CardDescription>{t(`features.${key}.description`)}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
