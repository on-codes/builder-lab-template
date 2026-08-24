"use server";

import { randomUUID } from "node:crypto";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { requireUser, UnauthorizedError } from "@/lib/auth/session";
import { checkRateLimit, RateLimitError } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/service";

export type UploadAvatarError =
  | "UNAUTHORIZED"
  | "NO_FILE"
  | "FILE_TOO_LARGE"
  | "INVALID_FILE_TYPE"
  | "RATE_LIMITED"
  | "UNKNOWN";

export type RemoveAvatarError = "UNAUTHORIZED" | "UNKNOWN";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB — see design.md Non-Goals (no client-side
// resize/compression in this change, so this cap is the only guard against a huge upload).
const AVATAR_EXTENSION_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};
const STORAGE_PUBLIC_URL_MARKER = "/object/public/avatars/";

/**
 * Stores the file at a fresh, random path inside the caller's own folder (never a fixed
 * "avatar.<ext>") so a replace can't be served stale from a browser/CDN cache and a failed
 * upload never leaves the user with no picture at all — see design.md. The now-orphaned
 * previous file (if any) is removed best-effort *after* the new one is confirmed stored.
 */
export async function uploadAvatar(
  formData: FormData,
): Promise<ActionResult<{ avatarUrl: string }, UploadAvatarError>> {
  try {
    const user = await requireUser();
    const service = createServiceClient();

    try {
      await checkRateLimit(service, `avatar-upload:${user.id}`, 10, 60 * 60);
    } catch (error) {
      if (error instanceof RateLimitError) return fail("RATE_LIMITED");
      throw error;
    }

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return fail("NO_FILE");
    }
    if (file.size > MAX_AVATAR_BYTES) {
      return fail("FILE_TOO_LARGE");
    }
    const extension = AVATAR_EXTENSION_BY_TYPE[file.type];
    if (!extension) {
      return fail("INVALID_FILE_TYPE");
    }

    const { data: existingProfile } = await service
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .single();

    const path = `${user.id}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await service.storage
      .from("avatars")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error("avatar upload failed", uploadError.message);
      return fail("UNKNOWN");
    }

    const {
      data: { publicUrl },
    } = service.storage.from("avatars").getPublicUrl(path);

    const { error: updateError } = await service
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    if (updateError) {
      console.error("failed to save avatar_url", updateError.message);
      // The file is already stored and orphaned at this point — best-effort cleanup so a
      // failed DB write doesn't also leak a Storage file nothing will ever reference.
      void service.storage
        .from("avatars")
        .remove([path])
        .then(undefined, () => {});
      return fail("UNKNOWN");
    }

    removeStoredAvatar(service, existingProfile?.avatar_url ?? null);

    return ok({ avatarUrl: publicUrl });
  } catch (error) {
    if (error instanceof UnauthorizedError) return fail("UNAUTHORIZED");
    throw error;
  }
}

export async function removeAvatar(): Promise<ActionResult<undefined, RemoveAvatarError>> {
  try {
    const user = await requireUser();
    const service = createServiceClient();

    const { data: existingProfile } = await service
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .single();

    const { error } = await service.from("profiles").update({ avatar_url: null }).eq("id", user.id);

    if (error) {
      console.error("removeAvatar failed", error.message);
      return fail("UNKNOWN");
    }

    removeStoredAvatar(service, existingProfile?.avatar_url ?? null);

    return ok(undefined);
  } catch (error) {
    if (error instanceof UnauthorizedError) return fail("UNAUTHORIZED");
    throw error;
  }
}

/** Fire-and-forget: never blocks the caller's response, logged on failure — see design.md. */
function removeStoredAvatar(
  service: ReturnType<typeof createServiceClient>,
  avatarUrl: string | null,
) {
  const path = pathFromAvatarUrl(avatarUrl);
  if (!path) return;

  void service.storage
    .from("avatars")
    .remove([path])
    .then(({ error }) => {
      if (error) console.error("failed to remove previous avatar file", error.message);
      return undefined;
    });
}

function pathFromAvatarUrl(url: string | null): string | null {
  if (!url) return null;
  const index = url.indexOf(STORAGE_PUBLIC_URL_MARKER);
  return index === -1 ? null : url.slice(index + STORAGE_PUBLIC_URL_MARKER.length);
}
