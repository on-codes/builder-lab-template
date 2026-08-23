import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SignupForm } from "./signup-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.Signup.metadata");
  return { title: t("title") };
}

export default function SignupPage() {
  return <SignupForm />;
}
