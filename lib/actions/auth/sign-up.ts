"use server";

import { z } from "zod";
import { getClientIp } from "@/lib/actions/client-ip";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { passwordSchema, validatePassword } from "@/lib/auth/password";
import { sendEmail } from "@/lib/email/send";
import VerifyEmail, * as verifyEmailTemplate from "@/emails/verify-email";
import { routing } from "@/i18n/routing";
import { checkRateLimit, RateLimitError } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/service";

const signUpSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
});

export type SignUpError =
  | "INVALID_INPUT"
  | "PASSWORD_TOO_SHORT"
  | "PASSWORD_TOO_WEAK"
  | "PASSWORD_BREACHED"
  | "RATE_LIMITED"
  | "UNKNOWN";

const VERIFY_LINK_TTL_HOURS = 24;

/**
 * Enumeration-safe by construction: on every path that isn't a validation error (bad
 * password, rate limit), this returns the same success shape whether or not the email
 * already had an account — see specs/authentication/spec.md "Signup response does not
 * reveal whether the email already exists".
 *
 * Uses the Admin API's generateLink (type: "signup") rather than the public signUp() call —
 * generateLink creates the user AND returns the verification link WITHOUT Supabase sending
 * its own email, so this app's own React Email template is the only email that goes out (see
 * .claude/skills/email-templates/SKILL.md and Section 7 of the build spec: every transactional
 * email is our own template, never a provider's built-in one).
 */
export async function signUp(input: {
  email: string;
  password: string;
}): Promise<ActionResult<{ email: string }, SignUpError>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return fail("INVALID_INPUT");
  }
  const { email, password } = parsed.data;

  const service = createServiceClient();

  try {
    const ip = await getClientIp();
    await checkRateLimit(service, `auth:signup:${ip}`, 5, 60 * 15);
  } catch (error) {
    if (error instanceof RateLimitError) return fail("RATE_LIMITED");
    throw error;
  }

  const passwordCheck = await validatePassword(password);
  if (!passwordCheck.ok) {
    return fail(
      passwordCheck.reason === "tooShort"
        ? "PASSWORD_TOO_SHORT"
        : passwordCheck.reason === "tooWeak"
          ? "PASSWORD_TOO_WEAK"
          : "PASSWORD_BREACHED",
    );
  }

  const { data, error } = await service.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/login` },
  });

  // Enumeration protection: an "already registered" error reaches the same success response
  // as a brand-new signup. Only a truly unexpected failure (Supabase unreachable,
  // misconfiguration) falls through as UNKNOWN.
  if (error) {
    if (isKnownBenignSignupError(error.message)) {
      return ok({ email });
    }
    console.error("signUp failed", error);
    return fail("UNKNOWN");
  }

  try {
    await sendEmail(
      { default: VerifyEmail, subject: verifyEmailTemplate.subject },
      {
        verifyUrl: data.properties.action_link,
        expiresInHours: VERIFY_LINK_TTL_HOURS,
        locale: routing.defaultLocale,
      },
      email,
      { userId: data.user.id },
    );
  } catch (sendError) {
    // The account exists either way — a failed send shouldn't be reported as a failed
    // signup (that would tell an attacker enumeration info via which failure they hit).
    // Logged so Claude can investigate; the person can request a fresh link if needed once
    // that flow exists.
    console.error("verification email send failed", sendError);
  }

  return ok({ email });
}

function isKnownBenignSignupError(message: string): boolean {
  return /already registered|already exists/i.test(message);
}
