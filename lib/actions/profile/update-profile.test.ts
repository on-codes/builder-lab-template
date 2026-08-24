import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/session")>();
  return {
    ...actual,
    requireUser: vi.fn<typeof actual.requireUser>(),
  };
});

// See lib/stripe/subscription.test.ts for why this is vi.hoisted() rather than a plain const —
// the vi.mock() factory below closes over these and runs before any ordinary top-level
// statement in this file, preceding const included.
const { mockFrom, mockUpdate, mockEq } = vi.hoisted(() => {
  const eq = vi.fn<(...args: unknown[]) => Promise<{ error: { message: string } | null }>>();
  const update = vi.fn<(values: unknown) => { eq: typeof eq }>(() => ({ eq }));
  const from = vi.fn<(table: string) => { update: typeof update }>(() => ({ update }));
  return { mockFrom: from, mockUpdate: update, mockEq: eq };
});

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: mockFrom }),
}));

import { requireUser, UnauthorizedError, type AuthedUser } from "@/lib/auth/session";
import { updateDisplayName } from "./update-profile";

const AUTHED_USER: AuthedUser = {
  id: "user-1",
  email: "jane@example.com",
  role: "owner",
  sessionId: "session-1",
};

beforeEach(() => {
  vi.mocked(requireUser).mockReset();
  mockFrom.mockClear();
  mockUpdate.mockClear();
  mockEq.mockReset();
});

describe("updateDisplayName", () => {
  it("rejects an empty name without calling requireUser", async () => {
    const result = await updateDisplayName({ displayName: "   " });

    expect(result).toEqual({ success: false, error: "INVALID_INPUT" });
    expect(requireUser).not.toHaveBeenCalled();
  });

  it("rejects a name over 80 characters", async () => {
    const result = await updateDisplayName({ displayName: "a".repeat(81) });
    expect(result).toEqual({ success: false, error: "INVALID_INPUT" });
  });

  it("rejects when there is no valid session", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new UnauthorizedError());

    const result = await updateDisplayName({ displayName: "Ada Lovelace" });

    expect(result).toEqual({ success: false, error: "UNAUTHORIZED" });
  });

  it("trims and saves a valid name, scoped to the caller's own row", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTHED_USER);
    mockEq.mockResolvedValueOnce({ error: null });

    const result = await updateDisplayName({ displayName: "  Ada Lovelace  " });

    expect(result).toEqual({ success: true, data: { displayName: "Ada Lovelace" } });
    expect(mockFrom).toHaveBeenCalledWith("profiles");
    expect(mockUpdate).toHaveBeenCalledWith({ display_name: "Ada Lovelace" });
    expect(mockEq).toHaveBeenCalledWith("id", "user-1");
  });

  it("surfaces a database error as UNKNOWN rather than throwing", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTHED_USER);
    mockEq.mockResolvedValueOnce({ error: { message: "connection lost" } });

    const result = await updateDisplayName({ displayName: "Ada Lovelace" });

    expect(result).toEqual({ success: false, error: "UNKNOWN" });
  });
});
