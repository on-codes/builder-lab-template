// Simple rate limiting backed by an atomic Postgres function. See
// supabase/migrations/00000000000001_rate_limits.sql for the table and the
// increment_rate_limit function, and .claude/skills/app-security/SKILL.md for the
// IP-vs-user_id keying convention.
import type { SupabaseClient } from "@supabase/supabase-js";

export class RateLimitError extends Error {
  constructor(message = "RATE_LIMITED") {
    super(message);
    this.name = "RateLimitError";
  }
}

export async function checkRateLimit(
  supabase: SupabaseClient,
  key: string,
  limit: number,
  windowSeconds: number,
) {
  const { data, error } = await supabase.rpc("increment_rate_limit", {
    p_key: key,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    // Fail open: never take the route down because of the rate limiter itself.
    console.error("rate limit check failed", error);
    return;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (row && row.count > limit) {
    throw new RateLimitError();
  }
}

export async function checkEmailSendLimit(supabase: SupabaseClient, userId: string) {
  // Template default: at most 5 transactional emails per user per hour.
  await checkRateLimit(supabase, `email:${userId}`, 5, 3600);
}
