"use server";

import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { requireUser, UnauthorizedError } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";

const updateDisplayNameSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
});

export type UpdateDisplayNameError = "INVALID_INPUT" | "UNAUTHORIZED" | "UNKNOWN";

/**
 * Writes through the service_role client, scoped by `.eq("id", user.id)` after `requireUser()`
 * — same convention as `lib/actions/auth/mfa-toggle.ts` for writing another field on this same
 * row.
 */
export async function updateDisplayName(input: {
  displayName: string;
}): Promise<ActionResult<{ displayName: string }, UpdateDisplayNameError>> {
  const parsed = updateDisplayNameSchema.safeParse(input);
  if (!parsed.success) {
    return fail("INVALID_INPUT");
  }

  try {
    const user = await requireUser();
    const service = createServiceClient();

    const { error } = await service
      .from("profiles")
      .update({ display_name: parsed.data.displayName })
      .eq("id", user.id);

    if (error) {
      console.error("updateDisplayName failed", error.message);
      return fail("UNKNOWN");
    }

    return ok({ displayName: parsed.data.displayName });
  } catch (error) {
    if (error instanceof UnauthorizedError) return fail("UNAUTHORIZED");
    throw error;
  }
}
