---
name: app-security
description: Use this skill when adding any public-facing route/action, any feature that sends email, or any place secrets/env vars are read or written. Covers rate limiting, per-user email send limits, input validation, and secret handling conventions for this template.
---

# Application Security Layers

## Secrets

- All secrets live in `.env.local` (git-ignored) locally, and in the Vercel project's
  environment variables for deploys — never hardcoded, never committed. This repo ships no
  `.env.example` (the permission rules block Claude from any `.env*` file);
  `docs/environment-variables.md` is its substitute and lists every variable, what it's for,
  and where its value comes from.
- `.claude/hooks/check-secrets.sh` scans every diff before commit/push for patterns that look
  like live keys (`sk_live_`, `sk_test_`, long base64/hex strings assigned to variables named
  like secrets, Supabase JWTs, AWS-style keys, etc.) and blocks the operation if found outside
  of `.env*` files.

## Rate limiting

Every public Route Handler / Server Action / Edge Function that isn't purely read-only from a
public table gets a rate limit. Reference approach using Supabase (a simple table + policy,
no extra infra needed):

```sql
create table if not exists public.rate_limits (
  key text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);
```

```ts
// lib/rate-limit.ts
export async function checkRateLimit(
  supabase: SupabaseClient,
  key: string,
  limit: number,
  windowSeconds: number,
) {
  const { data } = await supabase.rpc("increment_rate_limit", {
    p_key: key,
    p_window_seconds: windowSeconds,
  });
  if (data && data.count > limit) {
    throw new Error("RATE_LIMITED");
  }
}
```

(Implement `increment_rate_limit` as a Postgres function so the increment+read is atomic.)
Apply per IP for anonymous endpoints and per `user_id` for authenticated ones.

## Email sending limits

Transactional email (magic links, notifications, receipts) is capped per user to prevent abuse
and runaway costs:

- Default: **max 5 emails per user per hour**, configurable per project.
- Enforce with the same `rate_limits` table/function, keyed as `email:<user_id>`.
- If the limit is hit, fail the send silently to the caller but log it (server-side only) so
  Claude can investigate later — never let it become a user-facing crash.

## Input validation

- Validate every input at the boundary with **Zod** — Server Actions, Route Handlers, and
  form submissions all parse against a schema before touching the database.
- Never trust an ID, price, or role passed from the client; re-derive from the authenticated
  session or look it up server-side.

## Security headers

- Security headers — `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Strict-Transport-Security`, and `Permissions-Policy` — are set in
  `next.config.ts` and/or `proxy.ts`.
- CSRF: Next.js Server Actions have some built-in CSRF protection (same-origin checks on the
  request). Don't assume that's sufficient blindly — verify it for this project and write the
  verification up in `docs/decisions/` so there's a record of what was checked and confirmed.

## Checklist before marking a public-facing feature "done"

- [ ] Rate limit applied (per IP or per user, as appropriate)
- [ ] Email-sending paths respect the per-user cap
- [ ] All inputs validated with Zod
- [ ] No secret reachable from client code or committed to git
- [ ] Security headers are set and verified
