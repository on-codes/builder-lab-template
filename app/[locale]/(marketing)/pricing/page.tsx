import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { listPlans } from "@/lib/stripe/plans";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Marketing.Pricing.metadata");
  return { title: t("title") };
}

export default async function PricingPage() {
  const t = await getTranslations("Marketing.Pricing");
  const plans = listPlans();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-16 md:px-6">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("title")}</h1>
        <p className="text-muted-foreground text-balance">{t("subtitle")}</p>
      </div>

      <div className="mx-auto grid w-full max-w-3xl gap-4 sm:grid-cols-2">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription>{t(`plans.${plan.id}.tagline`)}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">{t("priceholder")}</p>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/signup">{t("cta")}</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <p className="text-muted-foreground mx-auto max-w-md text-center text-sm text-balance">
        {t("note")}
      </p>
    </div>
  );
}
