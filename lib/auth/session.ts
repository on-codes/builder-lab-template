import "server-only";
import { cookies, headers } from "next/headers";
import { clearSessionCookie, SESSION_COOKIE, setSessionCookie } from "@/lib/auth/cookies";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/lib/supabase/types";

export type UserRole = Database["public"]["Enums"]["user_role"];

export class UnauthorizedError extends Error {
  constructor(message = "Not authenticated") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Not allowed") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export type AuthedUser = {
  id: string;
  email: string;
  role: UserRole;
  sessionId: string;
};

/**
 * The authoritative auth check — called by every Server Action that touches user data,
 * regardless of what proxy.ts already redirected on (see CLAUDE.md 1.1: Server Actions
 * aren't in front of proxy.ts, so this can't be skipped). Requires BOTH a valid Supabase
 * user AND a non-revoked row in user_sessions for this app's own session cookie — see
 * openspec/changes/add-auth-foundation/design.md for why there are two layers.
 */
export async function requireUser(): Promise<AuthedUser> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) {
    throw new UnauthorizedError();
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    clearSessionCookie(cookieStore);
    throw new UnauthorizedError();
  }

  const service = createServiceClient();
  const { data: session } = await service
    .from("user_sessions")
    .select("id, user_id, revoked_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session || session.revoked_at || session.user_id !== user.id) {
    clearSessionCookie(cookieStore);
    throw new UnauthorizedError();
  }

  const { data: profile } = await service
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    throw new UnauthorizedError();
  }

  // Best-effort — a missed heartbeat on one request is not worth failing the request over.
  void service
    .from("user_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", sessionId)
    .then(undefined, () => {});

  return { id: user.id, email: user.email!, role: profile.role, sessionId };
}

/**
 * Loads the current role from the database and throws if it doesn't satisfy `role` — never
 * trusts a client-supplied role. `role` can be a single role or a list of roles that all
 * satisfy the check (e.g. `requireRole(["owner", "admin"])`).
 */
export async function requireRole(role: UserRole | UserRole[]): Promise<AuthedUser> {
  const user = await requireUser();
  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(user.role)) {
    throw new ForbiddenError();
  }
  return user;
}

/**
 * Creates a new user_sessions row and sets the bl_session cookie — called once a login is
 * FULLY complete (no MFA required, or MFA just succeeded). Never called mid-MFA-challenge.
 */
export async function createSession(userId: string): Promise<string> {
  const service = createServiceClient();
  const headerList = await headers();

  const { data, error } = await service
    .from("user_sessions")
    .insert({ user_id: userId, user_agent: headerList.get("user-agent") ?? null })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`failed to create session: ${error?.message}`);
  }

  const cookieStore = await cookies();
  setSessionCookie(cookieStore, data.id as string);
  return data.id as string;
}

/** Signs out of the current app session (and the underlying Supabase session). */
export async function endCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    const service = createServiceClient();
    await service
      .from("user_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", sessionId);
  }

  clearSessionCookie(cookieStore);
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
}

export type SessionSummary = {
  id: string;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
};

/** Lists the caller's own active (non-revoked) sessions, most recently active first. */
export async function listActiveSessions(): Promise<SessionSummary[]> {
  const user = await requireUser();
  const service = createServiceClient();

  const { data, error } = await service
    .from("user_sessions")
    .select("id, user_agent, created_at, last_seen_at")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .order("last_seen_at", { ascending: false });

  if (error) {
    throw new Error(`failed to list sessions: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    userAgent: row.user_agent as string | null,
    createdAt: row.created_at as string,
    lastSeenAt: row.last_seen_at as string,
    isCurrent: row.id === user.sessionId,
  }));
}

/** Revokes one of the CALLER's OWN sessions — never another user's, enforced by the user_id filter. */
export async function revokeSession(sessionId: string): Promise<{ wasCurrent: boolean }> {
  const user = await requireUser();
  const service = createServiceClient();

  const { error } = await service
    .from("user_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`failed to revoke session: ${error.message}`);
  }

  const wasCurrent = sessionId === user.sessionId;
  if (wasCurrent) {
    const cookieStore = await cookies();
    clearSessionCookie(cookieStore);
  }

  return { wasCurrent };
}
