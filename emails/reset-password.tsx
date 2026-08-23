import { Button, Heading, Text } from "@react-email/components";
import { getEmailTranslator } from "@/lib/i18n/email-translator";
import type { Locale } from "@/i18n/routing";
import { EmailLayout } from "./components/email-layout";

export type ResetPasswordEmailProps = {
  resetUrl: string;
  expiresInMinutes: number;
  locale: Locale;
};

export default async function ResetPasswordEmail({
  resetUrl,
  expiresInMinutes,
  locale,
}: ResetPasswordEmailProps) {
  const t = await getEmailTranslator(locale, "Emails.resetPassword");

  return (
    <EmailLayout preview={t("preview")}>
      <Heading as="h2" style={{ fontSize: "18px" }}>
        {t("heading")}
      </Heading>
      <Text>{t("body")}</Text>
      <Button
        href={resetUrl}
        style={{
          background: "#171717",
          color: "#fff",
          padding: "12px 20px",
          borderRadius: "6px",
          fontSize: "14px",
          fontWeight: 600,
          textDecoration: "none",
          display: "inline-block",
        }}
      >
        {t("action")}
      </Button>
      <Text style={{ color: "#666", marginTop: "24px" }}>
        {t("expiry", { minutes: expiresInMinutes })}
      </Text>
      <Text style={{ color: "#666" }}>{t("notYou")}</Text>
    </EmailLayout>
  );
}

export async function subject({ locale }: Pick<ResetPasswordEmailProps, "locale">) {
  const t = await getEmailTranslator(locale, "Emails.resetPassword");
  return t("subject");
}
