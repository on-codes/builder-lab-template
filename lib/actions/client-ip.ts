import "server-only";
import { headers } from "next/headers";

/**
 * Best-effort client IP for rate-limiting anonymous requests — Server Actions don't get a
 * request object directly, so this reads the header Vercel (and most reverse proxies) set.
 * Falls back to a constant key when nothing is present (e.g. local dev without a proxy in
 * front), which still rate-limits correctly for a single-machine dev/test run.
 */
export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]!.trim();
  }
  return headerList.get("x-real-ip") ?? "unknown";
}
