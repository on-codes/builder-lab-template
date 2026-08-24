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

// See lib/stripe/subscription.test.ts for why this is vi.hoisted() rather than plain consts —
// the vi.mock() factory below closes over these and runs before any ordinary top-level
// statement in this file, preceding const included.
const {
  mockProfilesFrom,
  mockSelectSingle,
  mockUpdateEq,
  mockStorageFrom,
  mockUpload,
  mockGetPublicUrl,
  mockRemove,
} = vi.hoisted(() => {
  const selectSingle = vi.fn<() => Promise<{ data: { avatar_url: string | null } | null }>>();
  const selectEq = vi.fn<(...args: unknown[]) => { single: typeof selectSingle }>(() => ({
    single: selectSingle,
  }));
  const select = vi.fn<(...args: unknown[]) => { eq: typeof selectEq }>(() => ({ eq: selectEq }));

  const updateEq = vi.fn<(...args: unknown[]) => Promise<{ error: { message: string } | null }>>();
  const update = vi.fn<(values: unknown) => { eq: typeof updateEq }>(() => ({ eq: updateEq }));

  const profilesFrom = vi.fn<(table: string) => { select: typeof select; update: typeof update }>(
    () => ({ select, update }),
  );

  const upload = vi.fn<(...args: unknown[]) => Promise<{ error: { message: string } | null }>>();
  const getPublicUrl = vi.fn<(...args: unknown[]) => { data: { publicUrl: string } }>();
  const remove = vi.fn<(...args: unknown[]) => Promise<{ error: { message: string } | null }>>();
  const storageFrom = vi.fn<
    (bucket: string) => {
      upload: typeof upload;
      getPublicUrl: typeof getPublicUrl;
      remove: typeof remove;
    }
  >(() => ({ upload, getPublicUrl, remove }));

  return {
    mockProfilesFrom: profilesFrom,
    mockSelectSingle: selectSingle,
    mockUpdateEq: updateEq,
    mockStorageFrom: storageFrom,
    mockUpload: upload,
    mockGetPublicUrl: getPublicUrl,
    mockRemove: remove,
  };
});

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: mockProfilesFrom,
    storage: { from: mockStorageFrom },
  }),
}));

import { requireUser, UnauthorizedError, type AuthedUser } from "@/lib/auth/session";
import { checkRateLimit, RateLimitError } from "@/lib/rate-limit";
import { removeAvatar, uploadAvatar } from "./avatar";

const AUTHED_USER: AuthedUser = {
  id: "user-1",
  email: "jane@example.com",
  role: "owner",
  sessionId: "session-1",
};

const PNG_FILE = new File(["fake-png-bytes"], "avatar.png", { type: "image/png" });

function formDataWithFile(file: File | null): FormData {
  const formData = new FormData();
  if (file) formData.append("file", file);
  return formData;
}

beforeEach(() => {
  vi.mocked(requireUser).mockReset();
  vi.mocked(checkRateLimit).mockReset();
  vi.mocked(checkRateLimit).mockResolvedValue(undefined);
  mockProfilesFrom.mockClear();
  mockSelectSingle.mockReset();
  mockUpdateEq.mockReset();
  mockStorageFrom.mockClear();
  mockUpload.mockReset();
  mockGetPublicUrl.mockReset();
  mockRemove.mockReset();
});

describe("uploadAvatar", () => {
  it("rejects when there is no file", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTHED_USER);

    const result = await uploadAvatar(formDataWithFile(null));

    expect(result).toEqual({ success: false, error: "NO_FILE" });
  });

  it("rejects a file over 5 MB", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTHED_USER);
    const bigFile = new File([new Uint8Array(6 * 1024 * 1024)], "big.png", { type: "image/png" });

    const result = await uploadAvatar(formDataWithFile(bigFile));

    expect(result).toEqual({ success: false, error: "FILE_TOO_LARGE" });
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("rejects a non-image file type", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTHED_USER);
    const pdfFile = new File(["not an image"], "resume.pdf", { type: "application/pdf" });

    const result = await uploadAvatar(formDataWithFile(pdfFile));

    expect(result).toEqual({ success: false, error: "INVALID_FILE_TYPE" });
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("rejects when there is no valid session", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new UnauthorizedError());

    const result = await uploadAvatar(formDataWithFile(PNG_FILE));

    expect(result).toEqual({ success: false, error: "UNAUTHORIZED" });
  });

  it("rejects once the per-user rate limit is exceeded", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTHED_USER);
    vi.mocked(checkRateLimit).mockRejectedValueOnce(new RateLimitError());

    const result = await uploadAvatar(formDataWithFile(PNG_FILE));

    expect(result).toEqual({ success: false, error: "RATE_LIMITED" });
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("stores a fresh upload and saves its public URL when there was no previous avatar", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTHED_USER);
    mockSelectSingle.mockResolvedValueOnce({ data: { avatar_url: null } });
    mockUpload.mockResolvedValueOnce({ error: null });
    mockGetPublicUrl.mockReturnValueOnce({
      data: { publicUrl: "https://x.supabase.co/storage/v1/object/public/avatars/user-1/new.png" },
    });
    mockUpdateEq.mockResolvedValueOnce({ error: null });

    const result = await uploadAvatar(formDataWithFile(PNG_FILE));

    expect(result).toEqual({
      success: true,
      data: { avatarUrl: "https://x.supabase.co/storage/v1/object/public/avatars/user-1/new.png" },
    });
    expect(mockUpdateEq).toHaveBeenCalledWith("id", "user-1");
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("removes the previous file after a successful replace", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTHED_USER);
    mockSelectSingle.mockResolvedValueOnce({
      data: { avatar_url: "https://x.supabase.co/storage/v1/object/public/avatars/user-1/old.png" },
    });
    mockUpload.mockResolvedValueOnce({ error: null });
    mockGetPublicUrl.mockReturnValueOnce({
      data: { publicUrl: "https://x.supabase.co/storage/v1/object/public/avatars/user-1/new.png" },
    });
    mockUpdateEq.mockResolvedValueOnce({ error: null });
    mockRemove.mockResolvedValueOnce({ error: null });

    const result = await uploadAvatar(formDataWithFile(PNG_FILE));

    expect(result.success).toBe(true);
    await vi.waitFor(() => expect(mockRemove).toHaveBeenCalledWith(["user-1/old.png"]));
  });

  it("surfaces a Storage upload failure as UNKNOWN without touching profiles", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTHED_USER);
    mockSelectSingle.mockResolvedValueOnce({ data: { avatar_url: null } });
    mockUpload.mockResolvedValueOnce({ error: { message: "bucket unavailable" } });

    const result = await uploadAvatar(formDataWithFile(PNG_FILE));

    expect(result).toEqual({ success: false, error: "UNKNOWN" });
    expect(mockUpdateEq).not.toHaveBeenCalled();
  });
});

describe("removeAvatar", () => {
  it("rejects when there is no valid session", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new UnauthorizedError());

    const result = await removeAvatar();

    expect(result).toEqual({ success: false, error: "UNAUTHORIZED" });
  });

  it("clears the avatar and removes the stored file", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTHED_USER);
    mockSelectSingle.mockResolvedValueOnce({
      data: { avatar_url: "https://x.supabase.co/storage/v1/object/public/avatars/user-1/old.png" },
    });
    mockUpdateEq.mockResolvedValueOnce({ error: null });
    mockRemove.mockResolvedValueOnce({ error: null });

    const result = await removeAvatar();

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockUpdateEq).toHaveBeenCalledWith("id", "user-1");
    await vi.waitFor(() => expect(mockRemove).toHaveBeenCalledWith(["user-1/old.png"]));
  });

  it("surfaces a database error as UNKNOWN rather than throwing", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(AUTHED_USER);
    mockSelectSingle.mockResolvedValueOnce({ data: { avatar_url: null } });
    mockUpdateEq.mockResolvedValueOnce({ error: { message: "connection lost" } });

    const result = await removeAvatar();

    expect(result).toEqual({ success: false, error: "UNKNOWN" });
  });
});
