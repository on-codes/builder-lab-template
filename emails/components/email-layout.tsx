import { Body, Container, Head, Hr, Html, Preview, Section, Text } from "@react-email/components";
import type * as React from "react";

const APP_NAME = "BuilderLab";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

/**
 * Shared wrapper every email template renders inside — one place to change branding
 * (logo/footer/legal links) instead of five. See .claude/skills/email-templates/SKILL.md.
 */
export function EmailLayout({ preview, children }: { preview: string; children: React.ReactNode }) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.logo}>{APP_NAME}</Text>
          <Section>{children}</Section>
          <Hr style={styles.hr} />
          <Text style={styles.footer}>
            {APP_NAME} · <a href={SITE_URL}>{SITE_URL.replace(/^https?:\/\//, "")}</a>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: "#f6f6f6",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  container: {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    padding: "32px",
    maxWidth: "480px",
    borderRadius: "8px",
  },
  logo: {
    fontSize: "18px",
    fontWeight: 700,
    margin: "0 0 24px",
  },
  hr: {
    borderColor: "#e6e6e6",
    margin: "32px 0 16px",
  },
  footer: {
    color: "#8a8a8a",
    fontSize: "12px",
  },
} as const;
