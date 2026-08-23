import "server-only";

/**
 * This app's own "fully authenticated" signal — separate from Supabase's own session cookie.
 * Its presence means a `user_sessions` row exists and hasn't been revoked. See
 * openspec/changes/add-auth-foundation/design.md and proxy.ts.
 */
export const SESSION_COOKIE = "bl_session";

/**
 * Set once a password has been verified but MFA hasn't been completed yet. Its value is the
 * id of the pending `mfa_otp_codes` row — an opaque pointer, never a user id or anything
 * else meaningful on its own; verifyMfaCode looks the row up server-side and re-validates
 * everything (hash, expiry, attempts) rather than trusting this cookie for anything beyond
 * "which pending attempt is this."
 */
export const MFA_PENDING_COOKIE = "bl_mfa_pending";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days, matches Supabase's default refresh-token lifetime
const MFA_PENDING_MAX_AGE_SECONDS = 60 * 10; // must stay in sync with the OTP expiry window

/**
 * The minimal shape this module needs from a cookie store. Deliberately not imported from
 * Next.js's own types: the `cookies()` result from `next/headers` is typed read-only even
 * though it's mutable at runtime inside a Server Action, and `NextResponse.cookies` has a
 * slightly different but structurally compatible shape — a small local interface accepts
 * both without reaching into Next's internal/unstable type paths.
 */
export interface CookieWriter {
  set(name: string, value: string, options?: Record<string, unknown>): void;
  delete(name: string): void;
}

const baseCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export function setSessionCookie(store: CookieWriter, sessionId: string) {
  store.set(SESSION_COOKIE, sessionId, {
    ...baseCookieOptions,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(store: CookieWriter) {
  store.delete(SESSION_COOKIE);
}

export function setMfaPendingCookie(store: CookieWriter, otpId: string) {
  store.set(MFA_PENDING_COOKIE, otpId, {
    ...baseCookieOptions,
    maxAge: MFA_PENDING_MAX_AGE_SECONDS,
  });
}

export function clearMfaPendingCookie(store: CookieWriter) {
  store.delete(MFA_PENDING_COOKIE);
}
