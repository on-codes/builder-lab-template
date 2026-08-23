# BuilderLab Template — Instructions for Claude

This repository **is** a production-grade SaaS boilerplate, built for people **with no
technical background** to clone and grow into their own product with the help of Claude Code.
Whoever is reading this file (you, Claude) is the only "engineer" on the project — the person
on the other side doesn't know how to program, can't read a stack trace, and should never need
any external technical help, no matter how much is running under the hood.

That's the whole point of a boilerplate: auth, billing, email, i18n, testing, and CI/CD are
already built, wired together, and tested — a new project is built by adding features on top
(new tables, new routes, new pages), never by re-doing any of that foundation. The complexity
lives in the code, not in what the person has to know.

Treat every sentence below as a rule, not a suggestion.

## 0. What's already here

Clone this repo, run `pnpm install`, fill in `.env.local`, run `pnpm dev` — signup, login,
forgot-password, email MFA, Stripe subscription checkout, a dashboard, and a public marketing
site all already work. There is nothing to scaffold and nothing to ask about the platform:
this template builds **one thing — a web dashboard** (Next.js), and it's already built.

If `app/` doesn't exist, something is very wrong (a corrupted clone, not a fresh project) —
this is not the "download a skeleton and answer one question" template it used to be. `/setup`
now _personalizes_ the boilerplate for a new project (product name, branding, which optional
pieces to keep) rather than building it from nothing. See `.claude/commands/setup.md`.

New feature work (the reason someone is cloning this) always means: add a table, add a route,
add a page, on top of the foundation below — and, for anything non-trivial, going through the
OpenSpec propose → implement → archive loop (section 14) so the change is documented before
it's built, not just improvised in chat.

## 1. Supported stack (don't deviate)

|                       | Web dashboard                                                                       |
| --------------------- | ----------------------------------------------------------------------------------- |
| Framework             | Next.js 16 (App Router, RSC, Server Actions, Turbopack) + TypeScript (strict)       |
| UI                    | shadcn/ui (Radix primitives) + Tailwind CSS v4                                      |
| Data fetching / cache | TanStack Query v5                                                                   |
| i18n                  | next-intl — English only at launch, architecture ready for more                     |
| Auth                  | Supabase Auth under custom shadcn UI: email+password, forgot/reset, email MFA (OTP) |
| Payments              | Stripe — Checkout + Customer Portal + webhooks, subscription billing, built in      |
| Email                 | React Email components, sent via Resend                                             |
| Backend               | Supabase (Postgres, RLS, Auth, Storage, Edge Functions) — always                    |
| Testing               | Vitest + React Testing Library (unit/integration), Playwright (E2E)                 |
| Lint / format         | oxlint / oxfmt                                                                      |
| Deploy                | Vercel                                                                              |
| CI/CD                 | GitHub Actions                                                                      |
| Spec workflow         | OpenSpec (proposal → implementation → archive) for non-trivial changes              |
| Package manager       | pnpm (always)                                                                       |

Never suggest another framework or another backend — even if the person asks for something
"simpler." If they ask, briefly explain why the template uses this stack (it's the one that's
tested, built, and wired together end to end) and continue with it. Unlike the very first
version of this template, payments, MFA, and i18n are **not** optional add-ons anymore — they
ship built and tested, because most real SaaS products need all three eventually, and building
them once, correctly, into the template is exactly what makes every future clone of this repo
skip that work entirely. What's still genuinely optional is _using_ the pieces a given idea
doesn't need (e.g. a project with only one price tier just deletes the second one) — never
whether the underlying auth/billing/email/i18n plumbing exists.

If the person asks for a **mobile app**, say clearly that this template doesn't cover it: the
whole toolkit (hooks, skills, agents, CI, OpenSpec conventions) is built and tested for the web
dashboard only. Offer to build the dashboard instead — never improvise a React Native/Expo
setup on top of this template.

### 1.1 Next.js 16 specifics — read before writing App Router code

Next.js 16 has real breaking changes since training data. `AGENTS.md` at the repo root (kept
up to date automatically by `next dev`) points at the version-matched docs bundled in
`node_modules/next/dist/docs/` — skim the relevant page before touching anything unfamiliar.
The two changes that bite most often in this codebase:

- The route-protection file is `proxy.ts` (not `middleware.ts` — that name is deprecated), and
  it does **not** run in front of Server Actions the way page routes assume. Every Server
  Action must independently check auth/role itself (`requireUser()` / `requireRole()`) —
  never assume `proxy.ts` already covered it.
- `cookies()`, `headers()`, `params`, and `searchParams` are async-only — no synchronous
  compatibility mode left. This matters everywhere the Supabase SSR client reads cookies.

### 1.2 pnpm is the only package manager

A "package manager" is the tool that installs the project's building blocks. This template
uses **pnpm** everywhere — the person's machine, GitHub Actions, and Vercel — so that all
three install exactly the same versions.

- **Minimum version: pnpm 11.18.0.** Anything older is not supported here. Check with
  `pnpm --version` before the first install and before any troubleshooting; if it prints
  something lower (or the command isn't found), fix it with one command:
  `corepack enable pnpm && corepack prepare pnpm@11.18.0 --activate`.
- **Node.js 24 (the current LTS)** is what this template runs on — locally, in GitHub
  Actions, and on Vercel, which supports 24.x. If `node --version` is below 24 on the
  person's own machine, they update Node first (nodejs.org, LTS installer) — nothing else
  will work until then, and it's the one setup step Claude can't do for them. (This does not
  apply to a sandboxed Claude Code execution environment Claude itself controls — there,
  Claude fixes the Node/pnpm version itself rather than asking anyone.)
- Never run `npm` or `yarn` in this project. They would create a second lock file
  (`package-lock.json` / `yarn.lock`), and from that point on "works on my machine" and
  "works in production" stop meaning the same thing. `.claude/settings.json` denies those
  commands outright.
- Command translation, when you find `npm`-based instructions in docs online:

  | Instead of                      | Run                              |
  | ------------------------------- | -------------------------------- |
  | `npm install`                   | `pnpm install`                   |
  | `npm ci`                        | `pnpm install --frozen-lockfile` |
  | `npm install <pkg>`             | `pnpm add <pkg>`                 |
  | `npm install -D <pkg>`          | `pnpm add -D <pkg>`              |
  | `npm run <script>` / `npm test` | `pnpm <script>` / `pnpm test`    |
  | `npx <local tool>`              | `pnpm exec <tool>`               |
  | `npx <one-off tool>`            | `pnpm dlx <tool>`                |

- `pnpm-lock.yaml` is **always committed**. CI installs with `--frozen-lockfile`, so a
  missing or stale lock file turns the checks red.
- `package.json` carries a `"packageManager": "pnpm@<version>"` field (11.18.0 or newer).
  That single line is what pins the same pnpm version in CI and on Vercel — never delete it,
  and never point it at a version below the minimum above.
- `package.json` also carries `"engines": { "node": ">=24", "pnpm": ">=11.18.0" }`. pnpm
  enforces `engines` by default, so a machine or build environment that's too old fails
  loudly and immediately instead of failing weirdly halfway through.
- A package's install/build script that needs to run (e.g. `esbuild`) may need approving —
  `pnpm approve-builds <pkg>` — pnpm blocks unknown postinstall scripts by default as a
  supply-chain safety measure. Only approve packages you recognize and trust.

## 2. Golden rule: zero technical intervention from the person

The person must NEVER need to:

- run SQL manually,
- read raw Vercel/Supabase logs and figure them out alone,
- decide whether a key can go to GitHub,
- resolve a merge conflict,
- write a test,
- understand what MFA, RLS, a webhook, or a migration _is_ beyond a one-sentence plain-English
  explanation the first time it comes up.

That is always Claude's job. If something breaks, Claude investigates (logs, MCP, hooks) and
either fixes it or explains in plain English what happened and what it has already done to fix
it. More moving parts than the original version of this template (auth, MFA, billing, i18n)
means _more_ discipline here, not less — never let the extra surface area become the person's
problem.

## 3. Secrets and keys — they never go to GitHub

- Every key (Supabase service_role, Stripe secret key, Resend API key, API tokens, etc.) lives
  **only** in `.env.local` locally and in the Vercel project's environment variables for
  deploys — never in code, never in a commit, never in a log printed to the terminal.
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
  Server Actions / Route Handlers / Edge Functions, never in code that runs in the browser.
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
- **Types**: `pnpm typecheck` (`tsc --noEmit`) must pass — TypeScript strict mode, no implicit
  `any`. Part of the pre-push gate, not optional.
- **Tests**: every new feature (a route, a Server Action, a screen, a business-logic function,
  an RLS policy) gets at least one unit test before being considered complete. See
  `.claude/skills/testing/SKILL.md`. No test = the task isn't done.
- **Pre-push check**: run `/pre-push-check` (or let the hook do it automatically) — secrets,
  migrations, lint, format, typecheck, and tests, in that order. Only run `git push` if all of
  them pass. If something fails, fix it first; never ask the person to "ignore the error."
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

## 8. Payments — built in, Stripe by default

Every clone of this template already has working subscription billing: Stripe Checkout (two
demo tiers, "Pro" and "Business" — rename or reprice them, don't rebuild the plumbing),
Customer Portal for self-service plan changes/cancellation, and a webhook handler that keeps
Supabase in sync. `.claude/skills/stripe-billing/SKILL.md` has the full details. Short rules
that don't change no matter how "built in" billing is:

- **Test keys (`sk_test_...`) by default, always.** Never switch a project to `live` keys
  without the person explicitly saying, out loud, that they're ready to charge real customers.
  When they do, confirm which key and where (the exact Vercel env var name) and let them paste
  the live secret key themselves — Claude never needs to see or type it.
- Stripe webhooks always validated with the signature (`stripe.webhooks.constructEvent`),
  never trust a payload without verifying it. The handler is idempotent — Stripe retries
  events, so check `event.id` against already-processed events before acting.
- Never log or persist card numbers, CVV, or any sensitive payment data — that's always
  Stripe's responsibility (Checkout/Portal), never our backend's.
- If a project genuinely doesn't want to charge anyone (a pure internal tool, a free product),
  that's fine — leave the Stripe code in place unused rather than ripping out the plumbing;
  it costs nothing to leave a `/pricing` page nobody links to.

## 9. Authentication & MFA

Built on Supabase Auth, but the person only ever sees this template's own shadcn screens —
never Supabase's default UI. `.claude/skills/supabase-security/SKILL.md` covers the technical
patterns; the non-negotiable behaviors:

- Signup requires email verification before first login. Login redirects to `/verify-mfa` when
  the user has MFA enabled.
- MFA is a 6-digit **email OTP** (not an authenticator app / TOTP) — expires in 5–10 minutes,
  resend is rate-limited, wrong attempts are capped with a lockout.
- Forgot-password and signup give the **same response** whether or not the email exists
  (account enumeration protection) — never let a timing or message difference leak that.
- Every Server Action and Route Handler re-checks auth/role itself
  (`requireUser()`/`requireRole()`), regardless of what `proxy.ts` already did — see 1.1.
- Passwords are checked against a breached-password list (a real library, never a hand-rolled
  blocklist) in addition to a minimum length/complexity rule.
- Rate limit every auth endpoint (login, signup, forgot-password, resend-OTP) — see section 12.

## 10. i18n — English now, more locales later without touching code

`next-intl` is wired through the whole app (auth, dashboard, marketing, emails) even though
only `messages/en.json` exists today. That's deliberate: retrofitting i18n after strings are
hardcoded everywhere is real, error-prone work, and doing it once up front means a second
locale is ever only "add `messages/<locale>.json` and one config entry" — never a code change.
Never hardcode a user-facing string outside the message catalog, in the app or in an email
template.

## 11. Email — React Email + Resend

Every transactional email (verification, password reset, MFA code, welcome, receipt/payment
failed) is a React Email component under `emails/`, sharing one `<EmailLayout>`, sent through
a single `sendEmail(template, props, to)` helper so the provider can be swapped later without
touching call sites. Copy comes from the i18n layer (section 10), never hardcoded English.
`pnpm email:dev` runs the local preview server. Every template has a test asserting its key
content/links render (see `.claude/skills/testing/SKILL.md`).

## 12. Application security layers

See `.claude/skills/app-security/SKILL.md` for the reference implementations:

- Rate limiting on every public route (Server Actions, Route Handlers, Edge Functions) —
  auth endpoints especially (section 9).
- A per-user/per-period email sending limit (e.g. max 5 transactional emails per hour per
  user) to prevent abuse and unexpected costs.
- Input validation at every boundary with Zod (never trust data coming from the client) —
  re-validate server-side even if a form already validated client-side.
- Security headers (CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Strict-Transport-Security`, `Permissions-Policy`) set in `next.config.ts` / `proxy.ts`.
- No secrets or PII in logs; anything that logs user data redacts sensitive fields first.

## 13. Connected MCPs

This template expects four MCP servers to be connected (config in `.mcp.json` at the root):
**GitHub, Vercel, Supabase, and Stripe** — all four, because billing is no longer optional
(section 8). Use them to read real state (deployments, tables, logs, Stripe objects) instead
of assuming. If an MCP tool isn't available, tell the person it needs to be connected (never
make up data). Stripe still defaults to **test mode** regardless of the MCP being connected —
connecting the MCP is not the same thing as the person confirming they're ready to go live.

## 14. OpenSpec — propose before you implement

Every non-trivial change (a new feature, a schema change, anything touching auth/billing/RLS)
goes through OpenSpec's propose → review → implement → verify → archive loop instead of being
improvised straight into code. `openspec/` at the repo root holds `specs/` (the living,
merged source of truth), `changes/` (in-flight proposals), and `archive/` (completed ones).

1. **Propose** — generate a `proposal.md` and a delta spec (requirements with
   `#### Scenario:` Given/When/Then blocks) for the change. Anything touching auth, billing,
   or RLS also gets a `design.md` — these are exactly the areas section 2 already says the
   person can't evaluate themselves, so the design has to be explicit and reviewable.
2. **Review** — this is the approval gate. For a solo, asynchronous session, presenting the
   proposal in plain English and proceeding once nothing about it is ambiguous or destructive
   satisfies this step; for anything touching auth/billing/RLS, or anything the Blueprint
   didn't clearly ask for, stop and ask the person first (`AskUserQuestion` when available) —
   never treat "I wrote a proposal" as the same thing as "someone reviewed it."
3. **Implement** — build strictly against the approved delta spec and design doc, tracking
   tasks with TodoWrite/TaskCreate as you go.
4. **Verify** — check the finished code against the delta spec/design doc for completeness
   (every scenario actually holds) before calling the change done.
5. **Archive** — merge the delta into the living spec and move the change folder into
   `openspec/archive/`.

Rules that are never negotiable:

- Every requirement needs at least one scenario; a proposal missing them isn't ready.
- Delta operations use `ADDED` / `MODIFIED` / `REMOVED` headers explicitly — a bare
  `MODIFIED` that silently drops the previous requirement text is data loss, not an edit.
- Keep context hygiene: OpenSpec is designed around short, focused sessions per change, not
  one long session accumulating unrelated proposals.

`.claude/GUARDRAILS.md` has the full list of what Claude should never do unattended in this
repo, including the OpenSpec-specific rules above.

## 15. How to talk to the person

- Plain English, no jargon without an explanation. If you need to use a technical term
  (e.g. "RLS", "migration", "webhook", "MFA", "OTP"), explain it in one short sentence the
  first time. After that, it's fine to use the term directly.
- Always confirm before: pushing to the remote repository, changing anything in production, or
  using a Stripe `live` key.

## 16. Working in parallel — several agents at once

Whenever there are two or more pieces of work that don't depend on each other, **run them at
the same time** instead of one after another.

### How to do it

- Spawn all the subagents for a round **in a single message**, each with `name:` and
  `run_in_background: true`. Multiple `Agent` calls in one message run concurrently; calls
  spread across separate messages don't.
- Give every agent a name that says what it owns (`schema`, `screen-dashboard`,
  `screen-settings`, `auth`) and an explicit, non-overlapping list of files it may touch.
- Tell each agent who to report to. For a chain (build → test → review), have each one
  `SendMessage` the next; for independent work, let them all report back here.
- Prefer the specialists already defined in `.claude/agents/` when they fit:
  `migration-guardian` (schema), `security-reviewer` (auth/data/payments/public routes),
  `deploy-doctor` (broken Vercel deploys).

### Safe to run in parallel

- Different screens, routes, or components — one agent per file or per screen.
- A migration for table A while another agent builds UI that doesn't read table A yet.
- Reading/researching anything (logs via MCP, existing code, Supabase state).
- Writing tests for code that is already finished, while another agent builds something else.
- A `security-reviewer` pass over finished code while the next feature is being built.

### Never in parallel — these stay sequential, no exceptions

- **Two agents editing the same file.** The second write silently overwrites the first.
- **Package installs.** Only one `pnpm add` / `pnpm install` at a time, ever — two at once
  corrupt `pnpm-lock.yaml`, and a corrupt lock file breaks CI and Vercel at the same moment.
  Batch the dependencies into one command instead.
- **`package.json`.** One agent owns it per round; the others ask that agent for changes.
- **Migrations touching the same table**, and any two migrations created in the same round —
  file-name timestamps and column changes collide.
- **git operations.** One commit or push at a time; the hooks run per operation and two at
  once produce a broken index.
- **The same OpenSpec change folder.** One change under `openspec/changes/` is one agent's
  responsibility at a time, same reasoning as package.json.

### After a parallel round

1. Wait for every agent to report — never assume a background agent finished.
2. Re-run the checks yourself on the combined result: `/pre-push-check` (secrets, migrations,
   lint, format, typecheck, tests). Subagents reporting "done" is not verification; the checks
   passing is.
3. Only then commit, and summarize to the person what came out of the round.

### What to tell the person

Say it in plain language before starting — "I'm going to build three parts at the same time:
the database, the dashboard screen, and the login" — and again when the round lands. Never
leave them staring at a silent screen while agents work in the background.
