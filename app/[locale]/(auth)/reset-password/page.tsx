import { getTranslations } from "next-intl/server";
import { ResetPasswordForm } from "./reset-password-form";

export async function generateMetadata() {
  const t = await getTranslations("Auth.ResetPassword.metadata");
  return { title: t("title") };
}

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
