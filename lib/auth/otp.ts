import "server-only";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 30;

export class OtpError extends Error {
  constructor(
    message: string,
    public code: "EXPIRED" | "INVALID" | "LOCKED" | "RATE_LIMITED" | "NOT_FOUND",
  ) {
    super(message);
    this.name = "OtpError";
  }
}

function hashCode(code: string) {
  const secret = process.env.OTP_HASH_SECRET;
  if (!secret) {
    throw new Error("OTP_HASH_SECRET is not set");
  }
  // A keyed hash (secret + code), not a plain hash of the code alone — the real protection
  // against brute force is the attempts cap below, this is defense in depth against someone
  // with database read access but not the app's secrets.
  return createHash("sha256").update(`${secret}:${code}`).digest("hex");
}

function generateCode(): string {
  // randomInt is cryptographically secure (backed by the platform CSPRNG), unlike Math.random.
  return randomInt(0, 10 ** OTP_LENGTH)
    .toString()
    .padStart(OTP_LENGTH, "0");
}

/**
 * Issues a new OTP for `userId`, invalidating any previous pending code for that user.
 * Returns the plaintext code (to email) and the row id (to store in the mfa_pending cookie —
 * see lib/auth/cookies.ts).
 */
export async function issueOtp(userId: string): Promise<{ code: string; otpId: string }> {
  const supabase = createServiceClient();

  // One pending code per user at a time — delete anything unexpired before issuing a new one,
  // so an old code can't still be redeemed once the user has a newer one.
  await supabase.from("mfa_otp_codes").delete().eq("user_id", userId);

  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("mfa_otp_codes")
    .insert({
      user_id: userId,
      code_hash: hashCode(code),
      expires_at: expiresAt,
      max_attempts: MAX_ATTEMPTS,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`failed to issue OTP: ${error?.message}`);
  }

  return { code, otpId: data.id as string };
}

/**
 * Verifies `code` against the pending OTP row `otpId`. Throws OtpError on any failure
 * (never returns a boolean the caller could mishandle). On success, deletes the row (single
 * use) and returns the user id it belonged to.
 */
export async function verifyOtp(otpId: string, code: string): Promise<{ userId: string }> {
  const supabase = createServiceClient();

  const { data: row } = await supabase
    .from("mfa_otp_codes")
    .select("id, user_id, code_hash, expires_at, attempts, max_attempts")
    .eq("id", otpId)
    .maybeSingle();

  if (!row) {
    throw new OtpError("No pending code for this attempt.", "NOT_FOUND");
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await supabase.from("mfa_otp_codes").delete().eq("id", otpId);
    throw new OtpError("This code has expired.", "EXPIRED");
  }

  if (row.attempts >= row.max_attempts) {
    await supabase.from("mfa_otp_codes").delete().eq("id", otpId);
    throw new OtpError("Too many incorrect attempts.", "LOCKED");
  }

  const submittedHash = Buffer.from(hashCode(code), "hex");
  const storedHash = Buffer.from(row.code_hash as string, "hex");
  const matches =
    submittedHash.length === storedHash.length && timingSafeEqual(submittedHash, storedHash);

  if (!matches) {
    await supabase
      .from("mfa_otp_codes")
      .update({ attempts: row.attempts + 1 })
      .eq("id", otpId);
    throw new OtpError("Incorrect code.", "INVALID");
  }

  await supabase.from("mfa_otp_codes").delete().eq("id", otpId);
  return { userId: row.user_id as string };
}

export async function canResendOtp(userId: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("mfa_otp_codes")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return true;
  const ageSeconds = (Date.now() - new Date(data.created_at).getTime()) / 1000;
  return ageSeconds >= RESEND_COOLDOWN_SECONDS;
}

export const OTP_TTL_SECONDS = OTP_TTL_MINUTES * 60;
