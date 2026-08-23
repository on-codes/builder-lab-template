import { getTranslations } from "next-intl/server";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/navigation";

type MarketingLayoutProps = {
  children: React.ReactNode;
};

// Public shell for every page outside the dashboard and auth flows: a header with the product
// name, marketing nav, and log in/sign up links, plus a footer with the legal links. This is a
// route group — "(marketing)" doesn't appear in the URL, so / stays / and /pricing stays
// /pricing. Server Component throughout: nothing here needs client-side interactivity.
export default async function MarketingLayout({ children }: MarketingLayoutProps) {
  const common = await getTranslations("Common");
  const t = await getTranslations("Marketing.nav");
  const tFooter = await getTranslations("Marketing.footer");
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-svh flex-col">
      <header>
        <div className="mx-auto flex min-h-14 max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 md:px-6">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            {common("appName")}
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium sm:gap-6">
            <Link
              href="/pricing"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("pricing")}
            </Link>
            <Link
              href="/about"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("about")}
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">{t("logIn")}</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">{t("signUp")}</Link>
            </Button>
          </div>
        </div>
      </header>
      <Separator />
      <main className="flex-1">{children}</main>
      <Separator />
      <footer>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm md:flex-row md:px-6">
          <p className="text-muted-foreground">
            {tFooter("copyright", { year, appName: common("appName") })}
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/terms"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {tFooter("terms")}
            </Link>
            <Link
              href="/privacy"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {tFooter("privacy")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
