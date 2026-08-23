import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Marketing.About.metadata");
  return { title: t("title") };
}

export default async function AboutPage() {
  const t = await getTranslations("Marketing.About");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-16 md:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground text-balance">{t("body")}</p>
    </div>
  );
}
