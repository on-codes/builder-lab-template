import { getTranslations } from "next-intl/server";
import { OTP_TTL_SECONDS } from "@/lib/auth/otp";
import { VerifyMfaForm } from "./verify-mfa-form";

export async function generateMetadata() {
  const t = await getTranslations("Auth.VerifyMfa.metadata");
  return { title: t("title") };
}

export default function VerifyMfaPage() {
  return <VerifyMfaForm ttlMinutes={Math.round(OTP_TTL_SECONDS / 60)} />;
}
