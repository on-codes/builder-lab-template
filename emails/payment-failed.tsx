import { Button, Heading, Text } from "@react-email/components";
import { getEmailTranslator } from "@/lib/i18n/email-translator";
import type { Locale } from "@/i18n/routing";
import { EmailLayout } from "./components/email-layout";

export type PaymentFailedEmailProps = {
  billingPortalUrl: string;
  locale: Locale;
};

export default async function PaymentFailedEmail({
  billingPortalUrl,
  locale,
}: PaymentFailedEmailProps) {
  const t = await getEmailTranslator(locale, "Emails.paymentFailed");

  return (
    <EmailLayout preview={t("preview")}>
      <Heading as="h2" style={{ fontSize: "18px" }}>
        {t("heading")}
      </Heading>
      <Text>{t("body")}</Text>
      <Button
        href={billingPortalUrl}
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
      <Text style={{ color: "#666", marginTop: "24px" }}>{t("footer")}</Text>
    </EmailLayout>
  );
}

export async function subject({ locale }: Pick<PaymentFailedEmailProps, "locale">) {
  const t = await getEmailTranslator(locale, "Emails.paymentFailed");
  return t("subject");
}
