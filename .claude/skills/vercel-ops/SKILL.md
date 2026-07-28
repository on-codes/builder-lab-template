---
name: vercel-ops
description: Use this skill whenever a Vercel deployment fails, the person says "it broke" / pastes a Vercel URL, or you need to diagnose or fix a production deploy issue without technical help from the user. Requires the Vercel MCP server (see /.mcp.json).
---

# Vercel Ops — self-service incident resolution

Goal: the person never needs to open the Vercel dashboard or read a log themselves.

## Step 1 — Pull the facts, don't guess

Use the Vercel MCP tools to:
1. Find the latest failed deployment for the project.
2. Fetch its build logs and runtime logs.
3. Fetch the project's current environment variables (names only — never print values that
   look like secrets back to the person or into a commit).

Never diagnose from memory of "what usually causes this" without checking the actual logs
first — the specific error string tells you which of the cases below applies.

## Step 2 — Common failure signatures and standard fixes

| Log signature | Likely cause | Fix |
|---|---|---|
| `Module not found: Can't resolve '...'` | missing dependency or typo in import | install the package with `pnpm add <pkg>` / fix the import path, commit (including `pnpm-lock.yaml`), push |
| `ERR_PNPM_OUTDATED_LOCKFILE` / `Cannot install with "frozen-lockfile"` | `package.json` changed but `pnpm-lock.yaml` wasn't committed with it | run `pnpm install` locally, commit the updated `pnpm-lock.yaml`, push (never switch the Vercel install command to `npm`) |
| `Environment variable "X" is not defined` / `undefined` used where a key is expected | env var missing on Vercel | if it's a secret, tell the person the exact name/value to paste into Vercel → Project → Settings → Environment Variables (never do this for them since you can't see the actual secret they hold); if it's a public value you already know, add it yourself via the MCP |
| `Type error: ...` (TypeScript build failure) | type mismatch introduced by a recent change | fix the type, run `oxlint`/`tsc --noEmit` locally, commit, push |
| `supabase.auth...` errors / 401s from Supabase at runtime | wrong or missing `NEXT_PUBLIC_SUPABASE_*` vars, or RLS blocking a query that should be allowed | check env vars first, then check the relevant policy per `supabase-security` skill |
| `Error: connect ECONNREFUSED` / timeout to an external API | rate limit or the API key is a test/live mismatch | check which key is set on Vercel vs local `.env.local` |
| Build succeeds, page 500s at runtime | uncaught error in a Server Component/Action | fetch the runtime function logs via MCP, find the stack trace, fix the code path |
| `stripe...` signature verification failed | webhook secret mismatch between Stripe dashboard and Vercel env var | regenerate/confirm the webhook secret matches (see `stripe-billing` skill) |

## Step 3 — Fix, verify, redeploy

1. Make the code fix.
2. Run the full local check (lint, format, tests — see `code-quality` and `testing` skills).
3. Commit and push — Vercel will auto-deploy from the connected branch.
4. Poll the new deployment via MCP until it's `READY`, then confirm to the person in one short
   sentence what broke and that it's fixed now. Don't dump the raw logs on them.

## When you truly cannot fix it without the person

Only for things that require access you don't have (e.g. a secret only they hold, a billing
issue on their Vercel account, a domain/DNS change). In that case give an exact, numbered,
non-technical set of steps — never "go check your environment variables," always the specific
name and where to paste it.
