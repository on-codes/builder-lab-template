# BuilderLab Template — Instructions for Claude

This repository is a template used in workshops where people **with no technical background**
build the MVP of an idea with the help of Claude Code. Whoever is reading this file (you,
Claude) is the only "engineer" on the project — the person on the other side doesn't know how
to program, can't read a stack trace, and should never need any external technical help.

Treat every sentence below as a rule, not a suggestion.

## 0. First thing to do on a new project

If the `app/` (or `src/`) directory doesn't exist yet, **don't** assume anything: run the
`/setup` command (see `.claude/commands/setup.md`) or ask the person directly:

> "Do you want to build a **website/dashboard (web)** or a **mobile app**?"

The answer defines the stack (see section 1) and must never be assumed by Claude without
confirmation, because it changes the whole project structure.

## 1. Supported stacks (don't deviate)

| | Web (dashboard/site) | Mobile (app) |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | React Native + Expo |
| UI | shadcn/ui + Tailwind | NativeWind (Tailwind for RN) |
| Data fetching / cache | TanStack Query | TanStack Query |
| Deploy | Vercel | EAS (Expo Application Services) |
| Backend | Supabase (always) | Supabase (always) |
| Payments | Stripe (always) | Stripe (always) |
| Package manager | pnpm (always) | pnpm (always) |

Never suggest another framework, another backend, or another payment provider — even if the
person asks for something "simpler." If they ask, briefly explain why the template uses this
stack (it's the one that's tested, with hooks and skills ready to go) and continue with it.

### 1.1 pnpm is the only package manager

A "package manager" is the tool that installs the project's building blocks. This template
uses **pnpm** everywhere — the person's machine, GitHub Actions, and Vercel — so that all
three install exactly the same versions.

- Never run `npm` or `yarn` in this project. They would create a second lock file
  (`package-lock.json` / `yarn.lock`), and from that point on "works on my machine" and
  "works in production" stop meaning the same thing. `.claude/settings.json` denies those
  commands outright.
- Command translation, when you find `npm`-based instructions in docs online:

  | Instead of | Run |
  |---|---|
  | `npm install` | `pnpm install` |
  | `npm ci` | `pnpm install --frozen-lockfile` |
  | `npm install <pkg>` | `pnpm add <pkg>` |
  | `npm install -D <pkg>` | `pnpm add -D <pkg>` |
  | `npm run <script>` / `npm test` | `pnpm <script>` / `pnpm test` |
  | `npx <local tool>` | `pnpm exec <tool>` |
  | `npx <one-off tool>` | `pnpm dlx <tool>` |

- `pnpm-lock.yaml` is **always committed**. CI installs with `--frozen-lockfile`, so a
  missing or stale lock file turns the checks red.
- `package.json` carries a `"packageManager": "pnpm@<version>"` field. That single line is
  what pins the same pnpm version in CI and on Vercel — never delete it.
- If `pnpm` isn't installed on the person's machine, the fix is one command:
  `corepack enable pnpm` (Corepack ships with Node 20+).
- **Mobile only**: Expo/React Native needs `node-linker=hoisted` in an `.npmrc` at the
  project root, because Metro (the bundler) can't follow pnpm's default symlinked
  `node_modules`. Set it before the first install.

## 2. Golden rule: zero technical intervention from the person

The person must NEVER need to:
- run SQL manually,
- read raw Vercel/Supabase logs and figure them out alone,
- decide whether a key can go to GitHub,
- resolve a merge conflict,
- write a test.

That is always Claude's job. If something breaks, Claude investigates (logs, MCP, hooks) and
either fixes it or explains in plain English what happened and what it has already done to fix
it.

## 3. Secrets and keys — they never go to GitHub

- Every key (Supabase service_role, Stripe secret key, API tokens, etc.) lives **only** in
  `.env.local` (web) or in `.env`/`app.config.ts` via `expo-secrets`/EAS secrets (mobile),
  never in code, never in a commit, never in a log printed to the terminal.
  Technical details in `.claude/skills/app-security/SKILL.md`.
- Before any `git commit` or `git push`, the security hooks
  (`.claude/hooks/check-secrets.sh`) run automatically. If anything that looks like a key is
  found in the diff, the commit/push is blocked and Claude must resolve it before continuing
  (move it to `.env`, add it to `.gitignore`, use an environment variable).
  Never work around this hook, never run `git commit --no-verify`.
- `.env*` (except `.env.example`) is always in this template's `.gitignore`. Never remove that
  line.

## 4. Supabase — secure by default

Read `.claude/skills/supabase-security/SKILL.md` before creating any table or route that
accesses user data. Summary of the non-negotiable rules:
- Every new table has **RLS (Row Level Security) enabled** starting from the migration that
  creates it. Never create a table without a policy.
- Authentication always via Supabase Auth. Sessions/cookies handled with the `@supabase/ssr`
  package (never store a token manually in `localStorage` on web).
- No database call from the client using the `service_role key`. That key only exists in
  Server Actions / Route Handlers / Edge Functions, never in code that runs in the browser or
  in the mobile app bundle.
- Every new policy is tested (see section 6) before being considered done.

## 5. Migrations — always additive, never destructive

Read `.claude/skills/safe-migrations/SKILL.md` before touching any schema. Non-negotiable
rule: **a migration never changes or removes something that is already in production.**
- Allowed: `CREATE TABLE`, `ALTER TABLE ... ADD COLUMN` (with `DEFAULT` or `NULL`),
  `CREATE INDEX`, new policies.
- Forbidden without explicit approval and a written rollback plan: `DROP TABLE`,
  `DROP COLUMN`, `ALTER COLUMN ... TYPE`, `RENAME COLUMN`, anything that rewrites an existing
  column.
- Need a different value in an existing column? Create a new column (`<name>_v2` or similar)
  and migrate the data in a separate step — never on top of the old column in the same
  migration.
- The `.claude/hooks/validate-migration.sh` hook scans every new file in
  `supabase/migrations/` and automatically blocks destructive commands.

## 6. Code quality — it can't break in production

- **Lint + format**: `oxlint` and `oxfmt` run automatically after any file edit (`PostToolUse`
  hook) and again before any push. Never commit code that fails `pnpm exec oxlint .` or
  `pnpm exec oxfmt --check .`.
- **Tests**: every new feature (a route, a Server Action, a screen, a business-logic function)
  gets at least one unit test before being considered complete. See
  `.claude/skills/testing/SKILL.md`. No test = the task isn't done.
- **Pre-push check**: run `/pre-push-check` (or let the hook do it automatically) — lint,
  format, tests, and secret scan, in that order. Only run `git push` if all four pass. If
  something fails, fix it first; never ask the person to "ignore the error."
- **PRs**: never merge a PR with red checks (CI). If Claude opened the PR, Claude is also
  responsible for getting it green before saying it's ready.

## 7. Vercel — Claude fixes the deploy on its own

If a deploy fails (the person will just paste the link or say "it broke"), Claude:
1. Uses the Vercel MCP to pull the logs from the failed deployment.
2. Diagnoses the cause (build error, missing env var, type error, etc.) — see
   `.claude/skills/vercel-ops/SKILL.md` for the most common errors and the standard fix for
   each one.
3. Fixes the code/configuration, runs the section 6 checks, commits, and pushes.
4. Only asks the person to do something manually (e.g. add an env var in the Vercel dashboard
   because it's a secret Claude can't see) when it's strictly necessary — and in that case
   gives the exact step-by-step, described in plain words.

## 8. Stripe — only what's necessary

See `.claude/skills/stripe-billing/SKILL.md`. Short rules:
- Test keys (`sk_test_...`) during the workshop; never use a `live` key without the person
  explicitly confirming they're ready to charge for real.
- Stripe webhooks always validated with the signature (`stripe.webhooks.constructEvent`),
  never trust a payload without verifying it.
- Never log or persist card numbers, CVV, or any sensitive payment data — that's always
  Stripe's responsibility (Checkout/Elements), never our backend's.

## 9. Application security layers

See `.claude/skills/app-security/SKILL.md` for the reference implementations:
- Rate limiting on every public route (Server Actions, Route Handlers, Edge Functions).
- A per-user/per-period email sending limit (e.g. max 5 transactional emails per hour per
  user) to prevent abuse and unexpected costs.
- Input validation at every boundary with Zod (never trust data coming from the client).

## 10. Connected MCPs

This template expects the following MCP servers to be connected (config in `.mcp.json` at the
root): GitHub, Vercel, Supabase, and Stripe. Use them to read real state (deployments, tables,
logs, invoices) instead of assuming. If an MCP tool isn't available, tell the person it needs
to be connected (never make up data).

## 11. How to talk to the person

- Plain English, no jargon without an explanation. If you need to use a technical term
  (e.g. "RLS", "migration", "webhook"), explain it in one short sentence the first time.
  After that, it's fine to use the term directly.
- Always confirm before: pushing to the remote repository, changing anything in production, or
  using a Stripe `live` key.
