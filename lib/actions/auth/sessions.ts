"use server";

import { fail, ok, type ActionResult } from "@/lib/actions/result";
import * as session from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/auth/session";

export async function listSessions(): Promise<
  ActionResult<session.SessionSummary[], "UNAUTHORIZED">
> {
  try {
    return ok(await session.listActiveSessions());
  } catch (error) {
    if (error instanceof UnauthorizedError) return fail("UNAUTHORIZED");
    throw error;
  }
}

export async function revokeSession(
  sessionId: string,
): Promise<ActionResult<{ signedOutCurrentDevice: boolean }, "UNAUTHORIZED">> {
  try {
    const { wasCurrent } = await session.revokeSession(sessionId);
    return ok({ signedOutCurrentDevice: wasCurrent });
  } catch (error) {
    if (error instanceof UnauthorizedError) return fail("UNAUTHORIZED");
    throw error;
  }
}
