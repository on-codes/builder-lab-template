import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/session")>();
  return {
    ...actual,
    requireUser: vi.fn<typeof actual.requireUser>(),
  };
});

// See app/api/webhooks/stripe/route.test.ts for why this is vi.hoisted() rather than a plain
// const — a factory below closes over this, and vi.mock() factories run before any ordinary
// top-level statement in this file, preceding const included.
const { mockMaybeSingle } = vi.hoisted(() => ({
  mockMaybeSingle: vi.fn<() => Promise<{ data: { status: string | null } | null }>>(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mockMaybeSingle,
        }),
      }),
    }),
  }),
}));

import { requireUser, UnauthorizedError, type AuthedUser } from "@/lib/auth/session";
import {
  hasActiveSubscription,
  requireActiveSubscription,
  SubscriptionRequiredError,
} from "./subscription";

const AUTHED_USER: AuthedUser = {
  id: "user-1",
  email: "member@example.com",
  role: "owner",
  sessionId: "session-1",
};

beforeEach(() => {
  vi.mocked(requireUser).mockReset();
  mockMaybeSingle.mockReset();
});

describe("requireActiveSubscription", () => {
  it("resolves for an active subscription", async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTHED_USER);
    mockMaybeSingle.mockResolvedValue({ data: { status: "active" } });

    await expect(requireActiveSubscription()).resolves.toBeUndefined();
  });

  it("resolves for a trialing subscription", async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTHED_USER);
    mockMaybeSingle.mockResolvedValue({ data: { status: "trialing" } });

    await expect(requireActiveSubscription()).resolves.toBeUndefined();
  });

  it("throws SubscriptionRequiredError when there is no subscription row at all", async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTHED_USER);
    mockMaybeSingle.mockResolvedValue({ data: null });

    await expect(requireActiveSubscription()).rejects.toBeInstanceOf(SubscriptionRequiredError);
  });

  it("throws SubscriptionRequiredError for a canceled subscription", async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTHED_USER);
    mockMaybeSingle.mockResolvedValue({ data: { status: "canceled" } });

    await expect(requireActiveSubscription()).rejects.toBeInstanceOf(SubscriptionRequiredError);
  });

  it("propagates UnauthorizedError from requireUser rather than masking it", async () => {
    vi.mocked(requireUser).mockRejectedValue(new UnauthorizedError());

    await expect(requireActiveSubscription()).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe("hasActiveSubscription", () => {
  it("returns true for an active subscription", async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTHED_USER);
    mockMaybeSingle.mockResolvedValue({ data: { status: "active" } });

    await expect(hasActiveSubscription()).resolves.toBe(true);
  });

  it("returns false — not a throw — when there's no active subscription", async () => {
    vi.mocked(requireUser).mockResolvedValue(AUTHED_USER);
    mockMaybeSingle.mockResolvedValue({ data: { status: "past_due" } });

    await expect(hasActiveSubscription()).resolves.toBe(false);
  });

  it("still propagates a real UnauthorizedError instead of swallowing it into false", async () => {
    vi.mocked(requireUser).mockRejectedValue(new UnauthorizedError());

    await expect(hasActiveSubscription()).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
