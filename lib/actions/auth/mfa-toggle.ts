"use server";

import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { requireUser, UnauthorizedError } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";

export type MfaToggleError = "UNAUTHORIZED" | "UNKNOWN";

export async function enableMfa(): Promise<ActionResult<undefined, MfaToggleError>> {
  return setMfaEnabled(true);
}

export async function disableMfa(): Promise<ActionResult<undefined, MfaToggleError>> {
  return setMfaEnabled(false);
}

async function setMfaEnabled(enabled: boolean): Promise<ActionResult<undefined, MfaToggleError>> {
  try {
    const user = await requireUser();
    const service = createServiceClient();
    const { error } = await service
      .from("profiles")
      .update({ mfa_enabled: enabled })
      .eq("id", user.id);

    if (error) {
      // Log only the message, not the raw PostgrestError object.
      console.error("failed to update mfa_enabled", error.message);
      return fail("UNKNOWN");
    }

    return ok(undefined);
  } catch (error) {
    if (error instanceof UnauthorizedError) return fail("UNAUTHORIZED");
    throw error;
  }
}
