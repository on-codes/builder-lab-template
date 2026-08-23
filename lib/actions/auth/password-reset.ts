"use server";

import { z } from "zod";
import ResetPasswordEmail, * as resetPasswordEmailTemplate from "@/emails/reset-password";
import { routing } from "@/i18n/routing";
import { getClientIp } from "@/lib/actions/client-ip";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { passwordSchema, validatePassword } from "@/lib/auth/password";
import { sendEmail } from "@/lib/email/send";
import { checkRateLimit, RateLimitError } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/service";

const emailSchema = z.object({ email: z.string().email() });
const RESET_LINK_TTL_MINUTES = 30;

export type RequestPasswordResetError = "INVALID_INPUT" | "RATE_LIMITED" | "UNKNOWN";

/**
 * Enumeration-safe: identical response whether or not the email has an account — see
 * specs/authentication/spec.md. Like signUp, this uses generateLink (type: "recovery")
 * instead of the public resetPasswordForEmail() so Supabase never sends its own email —
 * only this app's own template does.
 *
 * NOTE on the actual reset step: Supabase delivers recovery tokens via the URL fragment
 * (`#access_token=...&type=recovery`), which never reaches the server by design — so the
 * password UPDATE itself happens client-side (the browser Supabase client's `updateUser`),
 * not as a Server Action here. `validateNewPasswordForReset` below is what that client screen
 * calls first, to run the same server-side strength/breach checks signup uses before letting
 * the client proceed.
 */
export async function requestPasswordReset(input: {
  email: string;
}): Promise<ActionResult<undefined, RequestPasswordResetError>> {
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) {
    return fail("INVALID_INPUT");
  }
  const { email } = parsed.data;

  const service = createServiceClient();

  try {
    const ip = await getClientIp();
    await checkRateLimit(service, `auth:forgot-password:${ip}`, 5, 60 * 15);
  } catch (error) {
    if (error instanceof RateLimitError) return fail("RATE_LIMITED");
    throw error;
  }

  const { data, error } = await service.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password` },
  });

  if (error) {
    // Enumeration-safe: "no user found" and any other generateLink failure both reach the
    // same success response as a real account. Only log for genuine investigation.
    console.error(
      "requestPasswordReset: generateLink failed (may be a nonexistent email)",
      error.message,
    );
    return ok(undefined);
  }

  try {
    await sendEmail(
      { default: ResetPasswordEmail, subject: resetPasswordEmailTemplate.subject },
      {
        resetUrl: data.properties.action_link,
        expiresInMinutes: RESET_LINK_TTL_MINUTES,
        locale: routing.defaultLocale,
      },
      email,
      { userId: data.user.id },
    );
  } catch (sendError) {
    // sendEmail's contract is "never log to/subject/html" (lib/email/send.ts) — the reset
    // email body embeds a live recovery link, so only the exception message is logged here,
    // never the raw error object.
    console.error(
      "reset-password email send failed",
      sendError instanceof Error ? sendError.message : String(sendError),
    );
  }

  return ok(undefined);
}

export type ValidatePasswordError =
  | "PASSWORD_TOO_SHORT"
  | "PASSWORD_TOO_WEAK"
  | "PASSWORD_BREACHED";

const newPasswordSchema = z.object({ password: passwordSchema });

/** Called by the client-side reset-password screen before it calls Supabase's updateUser(). */
export async function validateNewPasswordForReset(input: {
  password: string;
}): Promise<ActionResult<undefined, ValidatePasswordError | "INVALID_INPUT">> {
  const parsed = newPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return fail("INVALID_INPUT");
  }

  const check = await validatePassword(parsed.data.password);
  if (!check.ok) {
    return fail(
      check.reason === "tooShort"
        ? "PASSWORD_TOO_SHORT"
        : check.reason === "tooWeak"
          ? "PASSWORD_TOO_WEAK"
          : "PASSWORD_BREACHED",
    );
  }

  return ok(undefined);
}
