import "server-only";
import { render } from "@react-email/render";
import type { ReactElement } from "react";
import { Resend } from "resend";
import { checkEmailSendLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/service";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS ?? "BuilderLab <notifications@example.com>";

export type EmailTemplate<P> = {
  default: (props: P) => Promise<ReactElement>;
  subject: (props: P) => Promise<string>;
};

/**
 * The only way any code in this app sends an email — see
 * .claude/skills/email-templates/SKILL.md. Bundles the per-user rate limit in so no call
 * site can forget it, and never logs the recipient address or rendered body.
 */
export async function sendEmail<P>(
  template: EmailTemplate<P>,
  props: P,
  to: string,
  options: { userId: string },
): Promise<void> {
  const service = createServiceClient();
  await checkEmailSendLimit(service, options.userId);

  const [subject, html] = await Promise.all([
    template.subject(props),
    template.default(props).then((element) => render(element)),
  ]);

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
    html,
  });

  if (error) {
    // Never log `to`, `subject`, or `html` — an opaque failure plus the provider's own error
    // code is enough to investigate from.
    console.error("email send failed", { code: error.name });
    throw new Error("EMAIL_SEND_FAILED");
  }
}
