import { Button, Heading, Text } from "@react-email/components";
import { getEmailTranslator } from "@/lib/i18n/email-translator";
import type { Locale } from "@/i18n/routing";
import { EmailLayout } from "./components/email-layout";

export type VerifyEmailProps = {
  verifyUrl: string;
  expiresInHours: number;
  locale: Locale;
};

export default async function VerifyEmail({ verifyUrl, expiresInHours, locale }: VerifyEmailProps) {
  const t = await getEmailTranslator(locale, "Emails.verifyEmail");

  return (
    <EmailLayout preview={t("preview")}>
      <Heading as="h2" style={{ fontSize: "18px" }}>
        {t("heading")}
      </Heading>
      <Text>{t("body")}</Text>
      <Button
        href={verifyUrl}
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
        {t("expiry", { hours: expiresInHours })}
      </Text>
      <Text style={{ color: "#666" }}>{t("notYou")}</Text>
    </EmailLayout>
  );
}

export async function subject({ locale }: Pick<VerifyEmailProps, "locale">) {
  const t = await getEmailTranslator(locale, "Emails.verifyEmail");
  return t("subject");
}
