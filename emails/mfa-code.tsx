import { Heading, Text } from "@react-email/components";
import { getEmailTranslator } from "@/lib/i18n/email-translator";
import type { Locale } from "@/i18n/routing";
import { EmailLayout } from "./components/email-layout";

export type MfaCodeEmailProps = {
  code: string;
  expiresInMinutes: number;
  locale: Locale;
};

export default async function MfaCodeEmail({ code, expiresInMinutes, locale }: MfaCodeEmailProps) {
  const t = await getEmailTranslator(locale, "Emails.mfaCode");

  return (
    <EmailLayout preview={t("preview")}>
      <Heading as="h2" style={{ fontSize: "18px" }}>
        {t("heading")}
      </Heading>
      <Text>{t("body")}</Text>
      <Text
        style={{
          fontSize: "32px",
          fontWeight: 700,
          letterSpacing: "8px",
          textAlign: "center",
          margin: "24px 0",
        }}
      >
        {code}
      </Text>
      <Text style={{ color: "#666" }}>{t("expiry", { minutes: expiresInMinutes })}</Text>
      <Text style={{ color: "#666" }}>{t("notYou")}</Text>
    </EmailLayout>
  );
}

export async function subject({ locale }: Pick<MfaCodeEmailProps, "locale">) {
  const t = await getEmailTranslator(locale, "Emails.mfaCode");
  return t("subject");
}
