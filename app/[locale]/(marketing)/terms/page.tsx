import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "../legal-page";

// Order matches the keys under Marketing.Terms.sections in messages/en.json.
const SECTION_KEYS = [
  "acceptance",
  "useOfService",
  "subscriptions",
  "termination",
  "liability",
  "changes",
  "contact",
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Marketing.Terms.metadata");
  return { title: t("title") };
}

export default async function TermsPage() {
  const t = await getTranslations("Marketing.Terms");
  return <LegalPage t={t} sectionKeys={SECTION_KEYS} />;
}
