import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "../legal-page";

// Order matches the keys under Marketing.Privacy.sections in messages/en.json.
const SECTION_KEYS = [
  "collection",
  "use",
  "sharing",
  "cookies",
  "security",
  "rights",
  "children",
  "changes",
  "contact",
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Marketing.Privacy.metadata");
  return { title: t("title") };
}

export default async function PrivacyPage() {
  const t = await getTranslations("Marketing.Privacy");
  return <LegalPage t={t} sectionKeys={SECTION_KEYS} />;
}
