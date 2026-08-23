"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import MfaCodeEmail, * as mfaCodeEmailTemplate from "@/emails/mfa-code";
import { routing } from "@/i18n/routing";
import { getClientIp } from "@/lib/actions/client-ip";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { setMfaPendingCookie } from "@/lib/auth/cookies";
import { issueOtp, OTP_TTL_SECONDS } from "@/lib/auth/otp";
import { createSession } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/send";
import { checkRateLimit, RateLimitError } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const logInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LogInError =
  | "INVALID_INPUT"
  | "INVALID_CREDENTIALS"
  | "EMAIL_NOT_VERIFIED"
  | "RATE_LIMITED"
  | "UNKNOWN";
export type LogInData = { mfaRequired: false } | { mfaRequired: true };

export async function logIn(input: {
  email: string;
  password: string;
}): Promise<ActionResult<LogInData, LogInError>> {
  const parsed = logInSchema.safeParse(input);
  if (!parsed.success) {
    return fail("INVALID_INPUT");
  }
  const { email, password } = parsed.data;

  const service = createServiceClient();

  try {
    const ip = await getClientIp();
    await checkRateLimit(service, `auth:login:${ip}`, 10, 60 * 15);
  } catch (error) {
    if (error instanceof RateLimitError) return fail("RATE_LIMITED");
    throw error;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  // Enumeration-safe: wrong password and no-such-account both land here identically.
  if (error || !data.user) {
    return fail("INVALID_CREDENTIALS");
  }

  if (!data.user.email_confirmed_at) {
    await supabase.auth.signOut();
    return fail("EMAIL_NOT_VERIFIED");
  }

  const { data: profile } = await service
    .from("profiles")
    .select("mfa_enabled")
    .eq("id", data.user.id)
    .single();

  if (!profile) {
    console.error("logIn: no profile row for authenticated user", data.user.id);
    return fail("UNKNOWN");
  }

  if (!profile.mfa_enabled) {
    await createSession(data.user.id);
    return ok({ mfaRequired: false });
  }

  const { code, otpId } = await issueOtp(data.user.id);
  const cookieStore = await cookies();
  setMfaPendingCookie(cookieStore, otpId);

  try {
    await sendEmail(
      { default: MfaCodeEmail, subject: mfaCodeEmailTemplate.subject },
      { code, expiresInMinutes: OTP_TTL_SECONDS / 60, locale: routing.defaultLocale },
      email,
      { userId: data.user.id },
    );
  } catch (sendError) {
    console.error("MFA code email send failed", sendError);
    // The code still exists and can be resent — don't fail the login attempt itself over an
    // email delivery hiccup; the verify-mfa screen offers a resend.
  }

  return ok({ mfaRequired: true });
}
