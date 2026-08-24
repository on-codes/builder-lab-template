import { beforeEach, describe, expect, it, vi } from "vitest";
import "@/test/mocks/next-headers";
import { mockCookieStore, resetMockRequest } from "@/test/mocks/next-headers";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn<(...args: unknown[]) => Promise<void>>(async () => undefined),
  RateLimitError: class RateLimitError extends Error {},
}));

vi.mock("@/lib/auth/otp", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/otp")>();
  return {
    ...actual,
    verifyOtp: vi.fn<typeof actual.verifyOtp>(),
    issueOtp: vi.fn<typeof actual.issueOtp>(),
    canResendOtp: vi.fn<typeof actual.canResendOtp>(async () => true),
  };
});

vi.mock("@/lib/auth/session", () => ({
  createSession: vi.fn<(userId: string) => Promise<string>>(async () => "new-session-id"),
}));

import { verifyOtp } from "@/lib/auth/otp";
import { OtpError } from "@/lib/auth/otp";
import { MFA_PENDING_COOKIE } from "@/lib/auth/cookies";
import { verifyMfaCode } from "./verify-mfa";

beforeEach(() => {
  resetMockRequest();
  vi.mocked(verifyOtp).mockReset();
});

describe("verifyMfaCode", () => {
  it("rejects when there is no pending MFA challenge cookie", async () => {
    const result = await verifyMfaCode({ code: "123456" });
    expect(result).toEqual({ success: false, error: "NO_PENDING_CHALLENGE" });
  });

  it("rejects malformed input before touching any pending challenge", async () => {
    mockCookieStore.set(MFA_PENDING_COOKIE, { value: "otp-1" });
    const result = await verifyMfaCode({ code: "abc" });
    expect(result).toEqual({ success: false, error: "INVALID_INPUT" });
  });

  it("succeeds and creates a session when the code is correct", async () => {
    mockCookieStore.set(MFA_PENDING_COOKIE, { value: "otp-1" });
    vi.mocked(verifyOtp).mockResolvedValueOnce({ userId: "user-1" });

    const result = await verifyMfaCode({ code: "482913" });

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockCookieStore.has(MFA_PENDING_COOKIE)).toBe(false);
  });

  it("surfaces an incorrect code as INVALID_CODE, not a thrown error", async () => {
    mockCookieStore.set(MFA_PENDING_COOKIE, { value: "otp-1" });
    vi.mocked(verifyOtp).mockRejectedValueOnce(new OtpError("Incorrect code.", "INVALID"));

    const result = await verifyMfaCode({ code: "000000" });

    expect(result).toEqual({ success: false, error: "INVALID_CODE" });
  });
});
