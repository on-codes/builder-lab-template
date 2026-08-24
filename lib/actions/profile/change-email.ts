"use server";

import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import ConfirmEmailChangeEmail, * as confirmEmailChangeTemplate from "@/emails/confirm-email-change";
import { routing } from "@/i18n/routing";
import { requireUser, UnauthorizedError } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/send";
import { checkRateLimit, RateLimitError } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const requestEmailChangeSchema = z.object({
  newEmail: z.string().trim().email(),
  currentPassword: z.string().min(1),
});

export type RequestEmailChangeError =
  | "INVALID_INPUT"
  | "UNAUTHORIZED"
  | "INVALID_PASSWORD"
  | "SAME_EMAIL"
  | "EMAIL_IN_USE"
  | "RATE_LIMITED"
  | "UNKNOWN";

const CHANGE_LINK_TTL_HOURS = 24;

/**
 * "Verifying your identity first" (the reference screenshot's own words) = re-checking the
 * current password via a real signInWithPassword call, then requiring a confirmation link
 * click before the address itself actually changes — see design.md's Decisions for both
 * halves of this. Nothing about the account changes until a generated link is used.
 */
export async function requestEmailChange(input: {
  newEmail: string;
  currentPassword: string;
}): Promise<ActionResult<undefined, RequestEmailChangeError>> {
  const parsed = requestEmailChangeSchema.safeParse(input);
  if (!parsed.success) {
    return fail("INVALID_INPUT");
  }
  const { newEmail, currentPassword } = parsed.data;

  try {
    const user = await requireUser();
    const service = createServiceClient();

    try {
      await checkRateLimit(service, `email-change:${user.id}`, 3, 60 * 60);
    } catch (error) {
      if (error instanceof RateLimitError) return fail("RATE_LIMITED");
      throw error;
    }

    if (newEmail.toLowerCase() === user.email.toLowerCase()) {
      return fail("SAME_EMAIL");
    }

    // This app's own cookie-backed SSR client, not the service client — only this one
    // actually performs a real password grant against Supabase Auth. See design.md.
    const supabase = await createClient();
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (reauthError) {
      return fail("INVALID_PASSWORD");
    }

    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings/profile`;

    // Generate both links before sending anything — a project's "Secure email change" setting
    // (unreadable from this app, see design.md) decides whether both must be confirmed or just
    // the new-address one, so both are always prepared and sent regardless of which applies.
    const newLinkResult = await service.auth.admin.generateLink({
      type: "email_change_new",
      email: user.email,
      newEmail,
      options: { redirectTo },
    });
    if (newLinkResult.error) {
      if (isKnownEmailInUseError(newLinkResult.error.message)) {
        return fail("EMAIL_IN_USE");
      }
      console.error("requestEmailChange: generateLink (new) failed", newLinkResult.error.message);
      return fail("UNKNOWN");
    }

    const currentLinkResult = await service.auth.admin.generateLink({
      type: "email_change_current",
      email: user.email,
      newEmail,
      options: { redirectTo },
    });
    if (currentLinkResult.error) {
      console.error(
        "requestEmailChange: generateLink (current) failed",
        currentLinkResult.error.message,
      );
      return fail("UNKNOWN");
    }

    const sendResults = await Promise.allSettled([
      sendEmail(
        { default: ConfirmEmailChangeEmail, subject: confirmEmailChangeTemplate.subject },
        {
          confirmUrl: newLinkResult.data.properties.action_link,
          newEmail,
          expiresInHours: CHANGE_LINK_TTL_HOURS,
          locale: routing.defaultLocale,
        },
        newEmail,
        { userId: user.id },
      ),
      sendEmail(
        { default: ConfirmEmailChangeEmail, subject: confirmEmailChangeTemplate.subject },
        {
          confirmUrl: currentLinkResult.data.properties.action_link,
          newEmail,
          expiresInHours: CHANGE_LINK_TTL_HOURS,
          locale: routing.defaultLocale,
        },
        user.email,
        { userId: user.id },
      ),
    ]);

    // The confirmation links already exist and work regardless of send success (same
    // reasoning as signUp/requestPasswordReset) — a failed send is logged, not surfaced as a
    // failed request, since re-requesting would just generate two more links.
    for (const result of sendResults) {
      if (result.status === "rejected") {
        console.error(
          "confirm-email-change send failed",
          result.reason instanceof Error ? result.reason.message : String(result.reason),
        );
      }
    }

    return ok(undefined);
  } catch (error) {
    if (error instanceof UnauthorizedError) return fail("UNAUTHORIZED");
    throw error;
  }
}

function isKnownEmailInUseError(message: string): boolean {
  return /already registered|already exists|already been registered|already in use/i.test(message);
}
