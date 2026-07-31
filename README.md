# BuilderLab Template

Template for the **"Build Your MVP with AI"** workshop — people with no technical background
build the MVP of an idea with Claude, using GitHub + Vercel + Supabase + Stripe.

It builds **one thing: a web dashboard** (Next.js on Vercel). That's deliberate — one tested
path, no platform decisions to make on the day.

## How to use it

1. Download the latest release as a .zip and unzip it into your project folder:
   **https://github.com/on-codes/builder-lab-template/releases/tag/1.0**
   ([direct download](https://github.com/on-codes/builder-lab-template/archive/refs/tags/1.0.zip))
   — no git clone needed, and everyone in the room runs exactly the same pinned version.
2. Open the project in Claude Code.
3. Connect the 4 MCPs: **GitHub**, **Vercel**, **Supabase**, and **Stripe** (configuration is
   already in `.mcp.json` — Claude Code will ask you to authenticate each one the first time
   it is used).
4. Type `/setup` and answer the one question (what is the idea?). Claude builds the project
   skeleton from there.

`PROMPT.md` is the prompt to paste into Claude Code if you're starting from an empty folder
instead — it tells Claude to fetch and install this template from the same .zip.

You don't need to understand what's inside `.claude/` to get started — that folder is for
Claude, not for you. What matters: **Claude already knows how to behave in this project**
before you even write your first message.

## What this template guarantees (without you having to ask)

- **Supabase security**: every table is born with Row Level Security enabled, sessions and
  cookies handled correctly, and the secret key never exposed to the browser.
- **Safe migrations**: database changes are always additive (they never delete or rewrite what
  already exists), so a migration can never break what's already in production.
- **Self-healing deploys**: if a Vercel deploy breaks, Claude reads the logs on its own (via
  MCP) and fixes it — you only get pulled in if a key that only you have needs to be pasted.
- **Stripe in the right mode**: test keys by default, webhooks validated, and no card data ever
  passes through your own code.
- **Always-clean code**: `oxlint` + `oxfmt` run automatically on every edit and before every
  push.
- **Nothing breaks without warning**: every push goes through lint, formatting, tests, and a
  secret scan before it leaves your machine; GitHub Actions runs the same checks on every PR.
- **Keys never leak**: a hook blocks any commit/push containing something that looks like a
  real API key.
- **Application security layers**: rate limiting on public routes and a per-user email limit
  come ready to use (`stacks/web/lib/rate-limit.ts` and
  `supabase/migrations/00000000000001_rate_limits.sql`).
- **Several things at once**: for independent work, Claude runs multiple agents in parallel
  (database, screens, payments) instead of building one piece at a time — with explicit rules
  about what must never overlap (see section 12 of `.claude/CLAUDE.md`).

## The stack

Next.js (App Router) + TypeScript + shadcn/ui + TanStack Query, deployed on Vercel.
Backend is always **Supabase**, payments are always **Stripe**.
Reference files live in `stacks/web/`.

## Structure of the `.claude/` folder

```
.claude/
├── CLAUDE.md              # general project rules — required reading for Claude
├── settings.json          # actually wires up the security/quality hooks
├── commands/               # slash commands (/setup, /new-feature, /new-migration, ...)
├── skills/                  # detailed guides per topic (Supabase, migrations, Vercel,
│                            # Stripe, code quality, testing, app security)
├── agents/                  # specialist subagents (deploy, migrations, security)
└── hooks/                   # real scripts that block secrets and destructive migrations,
                              # and run lint/format/tests automatically
```

## Available commands

| Command | What it does |
|---|---|
| `/setup` | Asks for your idea and builds the dashboard skeleton |
| `/new-feature` | Standard flow for building a feature from start to finish |
| `/new-migration` | Creates a new migration, always additive and with RLS |
| `/fix-vercel-deploy` | Investigates and fixes a broken deploy |
| `/pre-push-check` | Manually runs the full check before a push |
| `/security-audit` | Quick security audit of the whole project |

## Requirements for whoever facilitates the workshop

- GitHub, Vercel, Supabase, and Stripe accounts already created for each participant (or a
  shared account, depending on the workshop format).
- Claude Code installed, with the 4 MCPs from this `.mcp.json` connected.
- **Node.js 24 or newer** installed (`node --version` to check) — Node 24 is the current LTS,
  and it's what GitHub Actions and Vercel build with here. Anything older fails at the first
  install, on purpose: the whole point is that your machine, CI, and production run the same
  thing.
- **pnpm 11.18.0 or newer** enabled — one command, once per machine:
  `corepack enable pnpm && corepack prepare pnpm@11.18.0 --activate`. pnpm is the only package
  manager this template uses; `npm` and `yarn` are blocked on purpose so that your machine,
  GitHub Actions, and Vercel always install exactly the same versions.
