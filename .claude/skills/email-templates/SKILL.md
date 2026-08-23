---
name: email-templates
description: Use this skill whenever you create or edit a transactional email template, or any code that sends email. Covers the React Email + Resend setup under emails/, the sendEmail() helper every send goes through, pulling copy from the i18n layer, and the render-to-string test every template needs.
---

# Email Templates — React Email + Resend

Every transactional email (verification, password reset, MFA code, welcome, subscription
receipt/payment-failed) is a React Email component, rendered server-side, sent through Resend.
Two rules keep this safe for a person who will never read this code: every send goes through
one helper, and every string in the email comes from the same message catalog as the rest of
the app.

## Structure

Templates live in `emails/` at the repo root, one component per template, each wrapped in a
shared `<EmailLayout>` (`emails/components/email-layout.tsx` — logo, footer, legal links) so a
branding change is one file, not five. The five required templates:

- `verify-email.tsx` — signup verification link (required before first login, see
  `supabase-security`)
- `reset-password.tsx` — forgot-password flow
- `mfa-code.tsx` — the 6-digit email OTP; states the expiry in minutes ("expires in 10
  minutes" — an email can't run a live JS countdown) and always includes a "didn't request
  this?" line
- `welcome.tsx` — sent once signup is verified
- `subscription-receipt.tsx` / `payment-failed.tsx` — triggered by the Stripe webhook's
  `invoice.payment_succeeded` / `invoice.payment_failed` (`.claude/skills/stripe-billing/SKILL.md`)

## Copy comes from i18n, always

No string is ever typed directly into a template — see `.claude/skills/i18n/SKILL.md`. Emails
render outside a page request, so there's no ambient locale to read; pass it in explicitly. A
template file default-exports the component (so the local preview server can find it) and
names its subject line the same way:

```tsx
// emails/mfa-code.tsx
import { Text } from "@react-email/components";
import { getTranslations } from "next-intl/server";
import { EmailLayout } from "./components/email-layout";

type Props = { code: string; expiresInMinutes: number; locale: string };

export default async function MfaCodeEmail({ code, expiresInMinutes, locale }: Props) {
  const t = await getTranslations({ locale, namespace: "Emails.mfaCode" });

  return (
    <EmailLayout preview={t("preview")}>
      <Text>{t("body", { code })}</Text>
      <Text>{t("expiry", { minutes: expiresInMinutes })}</Text>
      <Text>{t("notYou")}</Text>
    </EmailLayout>
  );
}

export async function subject({ locale }: Pick<Props, "locale">) {
  const t = await getTranslations({ locale, namespace: "Emails.mfaCode" });
  return t("subject");
}
```

## Sending — always through `sendEmail`

Nothing calls the Resend SDK directly. Every send goes through one helper
(`lib/email/send.ts`) so the per-user rate limit is impossible to forget and the provider
could be swapped later without touching a single call site:

```ts
// lib/email/send.ts
import type { ReactElement } from "react";
import { Resend } from "resend";
import { checkRateLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/service";

const resend = new Resend(process.env.RESEND_API_KEY);

type EmailTemplate<P> = {
  default: (props: P) => Promise<ReactElement>;
  subject: (props: P) => Promise<string>;
};

export async function sendEmail<P extends { userId: string }>(
  template: EmailTemplate<P>,
  props: P,
  to: string,
) {
  const supabase = createServiceClient();
  await checkRateLimit(supabase, `email:${props.userId}`, 5, 60 * 60); // app-security skill

  const { error } = await resend.emails.send({
    from: "Your App <notifications@yourapp.com>",
    to,
    subject: await template.subject(props),
    react: await template.default(props),
  });

  if (error) {
    // never log `to` or the rendered body — an opaque failure is enough to act on
    throw new Error("EMAIL_SEND_FAILED");
  }
}
```

Call sites import the whole module and hand it straight to the helper — never
`resend.emails.send(...)` directly from a Server Action, Route Handler, or webhook:

```ts
import * as mfaCodeEmail from "@/emails/mfa-code";
await sendEmail(mfaCodeEmail, { code, expiresInMinutes: 10, locale, userId }, user.email);
```

## Local preview

`pnpm email:dev` runs React Email's local preview server against everything in `emails/`, so
the person can see exactly what a template looks like in a browser tab — nothing to read, just
look at it. **TODO — not wired up yet:** `package.json` doesn't have the `react-email` package
or an `"email:dev": "email dev"` script in this template as of now. Add both
(`pnpm add -D react-email`, plus the script) the first time this skill is used for real —
don't assume they already exist.

## Testing

Every template gets a render-to-string test that asserts on key content and links — not a
full-HTML snapshot, which breaks on every whitespace or class-name change and stops meaning
anything (`.claude/skills/testing/SKILL.md`):

```tsx
// emails/mfa-code.test.tsx
import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";
import MfaCodeEmail from "./mfa-code";

describe("MfaCodeEmail", () => {
  it("includes the code and the expiry", async () => {
    const html = await render(
      await MfaCodeEmail({ code: "482913", expiresInMinutes: 10, locale: "en" }),
    );

    expect(html).toContain("482913");
    expect(html).toMatch(/10/);
    expect(html).toMatch(/didn.t request|wasn.t you/i);
  });
});
```

Use synthetic fixture data (`test@example.com`, a fake code) in every test — never a real
person's email address or an OTP that was actually issued.

## Rate limiting and PII

- The per-user email cap (default 5/hour, `.claude/skills/app-security/SKILL.md`) lives inside
  `sendEmail`, not in each caller — that's the point of the indirection: a bug in one feature
  can't quietly mail someone in a loop, because every path to Resend runs through the same
  check.
- Never log a recipient address, an OTP code, a reset token, or a rendered email body. On
  failure, log the Resend error code/id only and let Claude investigate from there, the same
  as any other server-side-only failure.

## Checklist before marking an email template done

- [ ] Component lives in `emails/`, default-exported, wrapped in `<EmailLayout>`
- [ ] All copy comes from the message catalog via `getTranslations({ locale, ... })` — no
      string literal in the JSX
- [ ] Sent only through `sendEmail(template, props, to)` — no direct `resend.emails.send` call
      anywhere else
- [ ] Per-user rate limit still applies (it lives inside `sendEmail` — nothing routes around it)
- [ ] A render-to-string test asserts key content/links, using fake fixture data, not a
      full-HTML snapshot
- [ ] No email address, code, token, or rendered body ever appears in a log line
