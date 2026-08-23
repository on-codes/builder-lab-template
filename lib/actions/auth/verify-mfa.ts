"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import MfaCodeEmail, * as mfaCodeEmailTemplate from "@/emails/mfa-code";
import { routing } from "@/i18n/routing";
import { getClientIp } from "@/lib/actions/client-ip";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { clearMfaPendingCookie, MFA_PENDING_COOKIE, setMfaPendingCookie } from "@/lib/auth/cookies";
import { canResendOtp, issueOtp, OTP_TTL_SECONDS, OtpError, verifyOtp } from "@/lib/auth/otp";
import { createSession } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/send";
import { checkRateLimit, RateLimitError } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/service";

const codeSchema = z.object({ code: z.string().regex(/^\d{6}$/) });

export type VerifyMfaError =
  | "INVALID_INPUT"
  | "NO_PENDING_CHALLENGE"
  | "EXPIRED"
  | "INVALID_CODE"
  | "LOCKED"
  | "RATE_LIMITED"
  | "UNKNOWN";

export async function verifyMfaCode(
  input: unknown,
): Promise<ActionResult<undefined, VerifyMfaError>> {
  const parsed = codeSchema.safeParse(input);
  if (!parsed.success) {
    return fail("INVALID_INPUT");
  }

  const cookieStore = await cookies();
  const otpId = cookieStore.get(MFA_PENDING_COOKIE)?.value;
  if (!otpId) {
    return fail("NO_PENDING_CHALLENGE");
  }

  const service = createServiceClient();
  try {
    const ip = await getClientIp();
    await checkRateLimit(service, `auth:verify-mfa:${ip}`, 15, 60 * 15);
  } catch (error) {
    if (error instanceof RateLimitError) return fail("RATE_LIMITED");
    throw error;
  }

  try {
    const { userId } = await verifyOtp(otpId, parsed.data.code);
    clearMfaPendingCookie(cookieStore);
    await createSession(userId);
    return ok(undefined);
  } catch (error) {
    if (error instanceof OtpError) {
      if (error.code === "NOT_FOUND") return fail("NO_PENDING_CHALLENGE");
      if (error.code === "EXPIRED") return fail("EXPIRED");
      if (error.code === "LOCKED") return fail("LOCKED");
      return fail("INVALID_CODE");
    }
    throw error;
  }
}

export type ResendMfaError = "NO_PENDING_CHALLENGE" | "RATE_LIMITED" | "UNKNOWN";

export async function resendMfaCode(): Promise<ActionResult<undefined, ResendMfaError>> {
  const cookieStore = await cookies();
  const otpId = cookieStore.get(MFA_PENDING_COOKIE)?.value;
  if (!otpId) {
    return fail("NO_PENDING_CHALLENGE");
  }

  const service = createServiceClient();
  const { data: pending } = await service
    .from("mfa_otp_codes")
    .select("user_id")
    .eq("id", otpId)
    .maybeSingle();

  if (!pending) {
    clearMfaPendingCookie(cookieStore);
    return fail("NO_PENDING_CHALLENGE");
  }

  if (!(await canResendOtp(pending.user_id))) {
    return fail("RATE_LIMITED");
  }

  const {
    data: { user },
  } = await service.auth.admin.getUserById(pending.user_id);
  if (!user?.email) {
    return fail("UNKNOWN");
  }

  const { code, otpId: newOtpId } = await issueOtp(pending.user_id);
  setMfaPendingCookie(cookieStore, newOtpId);

  try {
    await sendEmail(
      { default: MfaCodeEmail, subject: mfaCodeEmailTemplate.subject },
      { code, expiresInMinutes: OTP_TTL_SECONDS / 60, locale: routing.defaultLocale },
      user.email,
      { userId: pending.user_id },
    );
  } catch (sendError) {
    console.error("MFA code resend email failed", sendError);
    return fail("UNKNOWN");
  }

  return ok(undefined);
}
