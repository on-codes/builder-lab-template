import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("NotFound.metadata");
  return { title: t("title") };
}

/**
 * Catches every unmatched route under app/[locale] — marketing pages, auth pages, and any
 * other URL that doesn't resolve to a page — with one exception that shares this same file:
 * app/[locale]/layout.tsx calls notFound() itself when the [locale] segment doesn't match a
 * supported locale (see routing.locales in i18n/routing.ts), and since that throw happens
 * inside the layout's own render, it also lands on this boundary. Renders inside
 * app/[locale]/layout.tsx, so next-intl's NextIntlClientProvider is already in the tree and
 * getTranslations works normally here — unlike the standalone app/not-found.tsx. No navbar
 * wraps this (it isn't inside (marketing) or (auth)), so it centers itself in the viewport
 * rather than assuming any chrome, same as app/[locale]/error.tsx.
 */
export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center gap-4 px-4 py-16 text-center md:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground text-balance">{t("description")}</p>
      <Button asChild>
        <Link href="/">{t("homeAction")}</Link>
      </Button>
    </div>
  );
}
