import { Button, Heading, Text } from "@react-email/components";
import { getEmailTranslator } from "@/lib/i18n/email-translator";
import type { Locale } from "@/i18n/routing";
import { EmailLayout } from "./components/email-layout";

export type ConfirmEmailChangeEmailProps = {
  confirmUrl: string;
  newEmail: string;
  expiresInHours: number;
  locale: Locale;
};

// Sent, unchanged, to both the current and the new address (see
// lib/actions/profile/change-email.ts and design.md) — the copy is written to make sense to
// either recipient rather than having two near-duplicate templates.
export default async function ConfirmEmailChangeEmail({
  confirmUrl,
  newEmail,
  expiresInHours,
  locale,
}: ConfirmEmailChangeEmailProps) {
  const t = await getEmailTranslator(locale, "Emails.confirmEmailChange");

  return (
    <EmailLayout preview={t("preview")}>
      <Heading as="h2" style={{ fontSize: "18px" }}>
        {t("heading")}
      </Heading>
      <Text>{t("body", { newEmail })}</Text>
      <Button
        href={confirmUrl}
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

export async function subject({ locale }: Pick<ConfirmEmailChangeEmailProps, "locale">) {
  const t = await getEmailTranslator(locale, "Emails.confirmEmailChange");
  return t("subject");
}
