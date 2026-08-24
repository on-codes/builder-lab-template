import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/session")>();
  return {
    ...actual,
    requireUser: vi.fn<typeof actual.requireUser>(),
  };
});

vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rate-limit")>();
  return {
    ...actual,
    checkRateLimit: vi.fn<typeof actual.checkRateLimit>(async () => undefined),
  };
});

vi.mock("@/lib/email/send", () => ({
  sendEmail: vi.fn<(...args: unknown[]) => Promise<void>>(async () => undefined),
}));

// See lib/stripe/subscription.test.ts for why this is vi.hoisted() rather than plain consts —
// the vi.mock() factories below close over these and run before any ordinary top-level
// statement in this file, preceding const included.
const { mockSignInWithPassword, mockGenerateLink } = vi.hoisted(() => ({
  mockSignInWithPassword:
    vi.fn<(...args: unknown[]) => Promise<{ error: { message: string } | null }>>(),
  mockGenerateLink: vi.fn<
    (...args: unknown[]) => Promise<{
      data: { properties: { action_link: string } | null };
      error: { message: string } | null;
    }>
  >(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signInWithPassword: mockSignInWithPassword } }),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ auth: { admin: { generateLink: mockGenerateLink } } }),
}));

import { requireUser, UnauthorizedError, type AuthedUser } from "@/lib/auth/session";
import { checkRateLimit, RateLimitError } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/send";
import { requestEmailChange } from "./change-email";

const AUTHED_USER: AuthedUser = {
  id: "user-1",
  email: "jane@example.com",
  role: "owner",
  sessionId: "session-1",
};

/** type-aware default: succeeds for both email_change_new and email_change_current calls. */
function mockGenerateLinkSuccess(overrides?: {
  newError?: { message: string };
  currentError?: { message: string };
}) {
  mockGenerateLink.mockImplementation(async (args: unknown) => {
    const { type } = args as { type: string };
    if (type === "email_change_new") {
      if (overrides?.newError) return { data: { properties: null }, error: overrides.newError };
      return {
        data: { properties: { action_link: "https://example.com/verify?token=new" } },
        error: null,
      };
    }
    if (overrides?.currentError)
      return { data: { properties: null }, error: overrides.currentError };
    return {
      data: { properties: { action_link: "https://example.com/verify?token=current" } },
      error: null,
    };
  });
}

beforeEach(() => {
  vi.mocked(requireUser).mockReset();
  vi.mocked(checkRateLimit).mockReset();
  vi.mocked(checkRateLimit).mockResolvedValue(undefined);
  vi.mocked(sendEmail).mockClear();
  vi.mocked(sendEmail).mockResolvedValue(undefined);
  mockSignInWithPassword.mockReset();
  mockSignInWithPassword.mockResolvedValue({ error: null });
  mockGenerateLink.mockReset();
  mockGenerateLinkSuccess();
});

describe("requestEmailChange", () => {
  it("rejects invalid input without calling requireUser", async () => {
    const result = await requestEmailChange({ newEmail: "not-an-email", currentPassword: "x" });

    expect(result).toEqual({ success: false, error: "INVALID_INPUT" });
    expect(requireUser).not.toHaveBeenCalled();
  });

  it("rejects when there is no valid session", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new UnauthorizedError());

    const result = await requestEmailChange({
      newEmail: "new@example.com",
      currentPassword: "correct-password",
    });

    expect(result).toEqual({ success: false, error: "UNAUTHORIZED" });
  });

  it("rejects once the per-user rate limit is exceeded", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTHED_USER);
    vi.mocked(checkRateLimit).mockRejectedValueOnce(new RateLimitError());

    const result = await requestEmailChange({
      newEmail: "new@example.com",
      currentPassword: "correct-password",
    });

    expect(result).toEqual({ success: false, error: "RATE_LIMITED" });
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it("rejects requesting the current email again, case-insensitively, before checking the password", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTHED_USER);

    const result = await requestEmailChange({
      newEmail: "JANE@example.com",
      currentPassword: "correct-password",
    });

    expect(result).toEqual({ success: false, error: "SAME_EMAIL" });
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it("rejects an incorrect current password before sending anything", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTHED_USER);
    mockSignInWithPassword.mockResolvedValueOnce({ error: { message: "Invalid credentials" } });

    const result = await requestEmailChange({
      newEmail: "new@example.com",
      currentPassword: "wrong-password",
    });

    expect(result).toEqual({ success: false, error: "INVALID_PASSWORD" });
    expect(mockGenerateLink).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("rejects a new email already in use by another account", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTHED_USER);
    mockGenerateLinkSuccess({ newError: { message: "Email address already registered" } });

    const result = await requestEmailChange({
      newEmail: "taken@example.com",
      currentPassword: "correct-password",
    });

    expect(result).toEqual({ success: false, error: "EMAIL_IN_USE" });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("surfaces an unexpected generateLink failure as UNKNOWN", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTHED_USER);
    mockGenerateLinkSuccess({ currentError: { message: "service unavailable" } });

    const result = await requestEmailChange({
      newEmail: "new@example.com",
      currentPassword: "correct-password",
    });

    expect(result).toEqual({ success: false, error: "UNKNOWN" });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("verifies the password, generates both links, and emails both addresses", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTHED_USER);

    const result = await requestEmailChange({
      newEmail: "new@example.com",
      currentPassword: "correct-password",
    });

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "jane@example.com",
      password: "correct-password",
    });
    expect(mockGenerateLink).toHaveBeenCalledTimes(2);
    expect(sendEmail).toHaveBeenCalledTimes(2);
    const recipients = vi.mocked(sendEmail).mock.calls.map((call) => call[2]);
    expect(recipients).toContain("new@example.com");
    expect(recipients).toContain("jane@example.com");
  });

  it("still succeeds if one confirmation email fails to send (link already exists either way)", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTHED_USER);
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error("EMAIL_SEND_FAILED"));

    const result = await requestEmailChange({
      newEmail: "new@example.com",
      currentPassword: "correct-password",
    });

    expect(result).toEqual({ success: true, data: undefined });
  });
});
