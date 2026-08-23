import { Button, Heading, Text } from "@react-email/components";
import { getEmailTranslator } from "@/lib/i18n/email-translator";
import type { Locale } from "@/i18n/routing";
import { EmailLayout } from "./components/email-layout";

export type SubscriptionReceiptEmailProps = {
  /** Smallest currency unit (e.g. cents) — matches Stripe's `invoice.amount_paid`. */
  amount: number;
  /** ISO 4217 currency code, as Stripe sends it (lowercase) — e.g. "usd". */
  currency: string;
  invoiceUrl?: string;
  locale: Locale;
};

function formatAmount(amount: number, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export default async function SubscriptionReceiptEmail({
  amount,
  currency,
  invoiceUrl,
  locale,
}: SubscriptionReceiptEmailProps) {
  const t = await getEmailTranslator(locale, "Emails.subscriptionReceipt");

  return (
    <EmailLayout preview={t("preview")}>
      <Heading as="h2" style={{ fontSize: "18px" }}>
        {t("heading")}
      </Heading>
      <Text>{t("body", { amount: formatAmount(amount, currency, locale) })}</Text>
      {invoiceUrl ? (
        <Button
          href={invoiceUrl}
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
          {t("viewInvoice")}
        </Button>
      ) : null}
      <Text style={{ color: "#666", marginTop: "24px" }}>{t("footer")}</Text>
    </EmailLayout>
  );
}

export async function subject({ locale }: Pick<SubscriptionReceiptEmailProps, "locale">) {
  const t = await getEmailTranslator(locale, "Emails.subscriptionReceipt");
  return t("subject");
}
