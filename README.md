# BuilderLab Template

A production-grade **SaaS boilerplate** for the **"Build Your MVP with AI"** workshop —
people with no technical background build and grow a real product with Claude Code, using
GitHub + Vercel + Supabase + Stripe. Unlike a bare framework starter, this template is not a
skeleton you scaffold from — it's a **working product already**: signup, login, forgot
password, email MFA, a Stripe subscription (two demo plans), a dashboard, and a public
marketing site all work the moment you clone it and fill in your own keys.

It builds **one thing: a web dashboard** (Next.js on Vercel). That's deliberate — one tested
path, no platform decisions to make on the day. Every new project built on this template is
just: add a table, add a route, add a page — never re-do auth, billing, email, i18n, testing,
or CI/CD, because all of that is already built, wired together, and tested.

## How to use it

1. Download the latest release as a .zip and unzip it into your project folder:
   **https://github.com/on-codes/builder-lab-template/releases/tag/2.0**
   ([direct download](https://github.com/on-codes/builder-lab-template/archive/refs/tags/2.0.zip))
   — no git clone needed, so your project starts its own clean git history instead of
   inheriting this template's.
2. Open the project in Claude Code.
3. Connect the 4 MCPs: **GitHub**, **Vercel**, **Supabase**, and **Stripe** (configuration is
   already in `.mcp.json` — Claude Code will ask you to authenticate each one the first time
   it is used). Stripe defaults to **test mode** — nobody needs to charge a real card to build,
   test, and deploy.
4. Paste **`PROMPT.md`** into Claude Code and let it run. That single prompt takes the project
   from "just unzipped" to live on the internet: it installs the dependencies, creates your
   Supabase database and applies every migration, sets up Stripe's test-mode plans and
   webhook, wires up Resend for email, writes `.env.local`, pushes to GitHub, and deploys to
   Vercel. You'll be asked for a handful of keys from your own accounts along the way —
   Claude tells you exactly where to click for each one.
5. Type `/setup` and answer a couple of quick questions (product name, which demo pricing
   tiers to keep) — Claude personalizes the boilerplate for your idea. Then just describe the
   feature you want next; Claude builds it on top of the foundation below.

`docs/environment-variables.md` explains every environment variable in plain English — what it
is, where it comes from, and which ones are secrets. Read it if you'd rather set things up by
hand than let `PROMPT.md` do it.

You don't need to understand what's inside `.claude/` or `openspec/` to get started — those
folders are for Claude, not for you. What matters: **Claude already knows how to behave in
this project** before you even write your first message.

## What this template guarantees (without you having to ask)

- **A working product on day one**: auth (with email MFA), a Stripe subscription, a dashboard
  shell, and a marketing site all already work — you're never staring at a blank scaffold.
- **Supabase security**: every table is born with Row Level Security enabled, sessions and
  cookies handled correctly, and the secret key never exposed to the browser.
- **Safe migrations**: database changes are always additive (they never delete or rewrite what
  already exists), so a migration can never break what's already in production.
- **Self-healing deploys**: if a Vercel deploy breaks, Claude reads the logs on its own (via
  MCP) and fixes it — you only get pulled in if a key that only you have needs to be pasted.
- **Billing that's already correct**: Stripe Checkout, the Customer Portal, and webhook
  handling (signature-verified, idempotent) are built in — you rename or reprice the two demo
  plans, you don't build billing from scratch.
- **Ready for more than one language**: every screen and email goes through an i18n layer from
  day one. It ships English-only, but adding a second language later is a message file, never
  a code change.
- **Always-clean code**: `oxlint` + `oxfmt` run automatically on every edit and before every
  push, alongside a full TypeScript strict-mode check.
- **Nothing breaks without warning**: every push goes through secret scanning, migration
  validation, lint, format, type-checking, and tests before it leaves your machine; GitHub
  Actions runs the same checks (plus the end-to-end signup-to-subscribe test) on every PR.
- **Keys never leak**: a hook blocks any commit/push containing something that looks like a
  real API key.
- **Every non-trivial change is proposed before it's built**: this template uses
  [OpenSpec](https://openspec.dev) so a feature's intent and design live in a reviewable
  Markdown proposal before Claude writes code — especially for anything touching auth,
  billing, or your database's access rules.
- **Several things at once**: for independent work, Claude runs multiple agents in parallel
  (database, screens, login) instead of building one piece at a time — with explicit rules
  about what must never overlap (see section 16 of `.claude/CLAUDE.md`).

## The stack

Next.js 16 (App Router) + TypeScript (strict) + shadcn/ui (Radix) + Tailwind CSS v4 +
TanStack Query v5, deployed on Vercel. Backend is always **Supabase**. Payments are always
**Stripe** (test mode by default). Transactional email is React Email components sent through
Resend. i18n is `next-intl`, English-only at launch. Testing is Vitest + React Testing Library
for units/integration and Playwright for the end-to-end golden path.

## Structure of the `.claude/` folder

```
.claude/
├── CLAUDE.md              # general project rules — required reading for Claude
├── GUARDRAILS.md          # what Claude must never do unattended
├── settings.json          # actually wires up the security/quality hooks
├── commands/               # slash commands (/setup, /new-feature, /new-migration, ...)
├── skills/                  # detailed guides per topic (Supabase, auth/MFA, migrations,
│                            # Stripe, i18n, email templates, Vercel, code quality, testing,
│                            # app security)
├── agents/                  # specialist subagents (deploy, migrations, security)
└── hooks/                   # real scripts that block secrets and destructive migrations,
                              # and run lint/format/typecheck/tests automatically
```

`openspec/` (once `openspec init` has run) holds the proposal → implementation → archive
workflow described in `.claude/CLAUDE.md` section 14 — every non-trivial feature request goes
through it.

## Available commands

| Command              | What it does                                                               |
| -------------------- | -------------------------------------------------------------------------- |
| `/setup`             | Personalizes the boilerplate for your idea (name, branding, pricing tiers) |
| `/new-feature`       | Standard flow for building a feature from start to finish                  |
| `/new-migration`     | Creates a new migration, always additive and with RLS                      |
| `/fix-vercel-deploy` | Investigates and fixes a broken deploy                                     |
| `/pre-push-check`    | Manually runs the full check before a push                                 |
| `/security-audit`    | Quick security audit of the whole project                                  |

## Requirements for whoever facilitates the workshop

- GitHub, Vercel, Supabase, and Stripe accounts already created for each participant (or a
  shared account, depending on the workshop format). Stripe only needs a free/test-mode
  account — no one needs to enable real payouts to build and demo the product.
- Claude Code installed, with the 4 MCPs from this `.mcp.json` connected.
- **Node.js 24 or newer** installed (`node --version` to check) — Node 24 is the current LTS,
  and it's what GitHub Actions and Vercel build with here. Anything older fails at the first
  install, on purpose: the whole point is that your machine, CI, and production run the same
  thing.
- **pnpm 11.18.0 or newer** enabled — one command, once per machine:
  `corepack enable pnpm && corepack prepare pnpm@11.18.0 --activate`. pnpm is the only package
  manager this template uses; `npm` and `yarn` are blocked on purpose so that your machine,
  GitHub Actions, and Vercel always install exactly the same versions.
