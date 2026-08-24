You are helping a non-technical founder build on top of a SaaS boilerplate during a live
workshop.

## Context

This project is built on the BuilderLab starter template, which is distributed as a **.zip
release** (not as a git repository to clone):

- Release page: https://github.com/on-codes/builder-lab-template/releases/tag/1.0
- Direct download: https://github.com/on-codes/builder-lab-template/archive/refs/tags/1.0.zip

Unlike a bare framework starter, this template is not an empty skeleton — it's a **working
product already**: signup, login, forgot password, email MFA, a Stripe subscription (two demo
plans, test mode), a dashboard, and a public marketing site all work out of the box. We are
building on a **WEB DASHBOARD** — Next.js 16 (App Router) + TypeScript + shadcn/ui + TanStack
Query, deployed on Vercel. There is no mobile app in scope, so don't ask me to choose a
platform and don't propose React Native/Expo.

Stack (all managed through MCP — do not use CLI commands or ask me to log into dashboards
manually):

- Hosting: Vercel (via MCP)
- Database/Auth: Supabase (via MCP)
- Payments: Stripe (via MCP) — test mode by default, already wired up
- Source control: GitHub (via MCP)

Tooling requirements: **Node.js 24+ (current LTS)** and **pnpm 11.18.0 or newer**. pnpm is the
only package manager allowed here — never `npm` or `yarn`.

## Step 0 — Check MCP connections

Before anything else, check which MCP tools you currently have access to for GitHub, Supabase,
Vercel, and Stripe.

- If any of these are missing, tell me clearly which one is not connected and ask me to
  connect it before continuing.
- Do not fall back to manual CLI setup, terminal commands, or asking me to click through a web
  dashboard for anything these MCP tools can do. MCP is the only path for these actions.

## Step 1 — Install the starter template from the .zip (mandatory, do this first)

This is the most important setup step, and it gives us a **fully working app**, not an empty
skeleton:

1. Check whether the template is already here: if `.claude/CLAUDE.md` exists at the root of
   this project, the template is already installed — confirm that to me and go straight to
   Step 2.
2. If it isn't here, download and extract the release .zip yourself, from the project root:
   ```bash
   curl -L -o /tmp/builder-lab-template.zip https://github.com/on-codes/builder-lab-template/archive/refs/tags/1.0.zip
   unzip -q -o /tmp/builder-lab-template.zip -d /tmp
   cp -R /tmp/builder-lab-template-1.0/. .
   ```
   (These shell commands are expected and allowed — the .zip is a plain file download, not one
   of the MCP-managed services above. This copies the _entire_ project — the app already
   included, not just the `.claude/` toolkit.)
3. Everything lands exactly as-is. Do not modify, skip, or "summarize" any of it — these files
   contain rules and restrictions that must apply to this project, and code that must keep
   working. If a file already exists here, show me the difference and ask before overwriting
   it.
4. Do **not** clone the repository, do not fetch these files through the GitHub MCP, and do
   not rewrite them from memory. The .zip above is the only source, so that every participant
   runs exactly the same pinned version of the template.
5. Run `pnpm install`, confirm `pnpm build` succeeds, and confirm `.claude/` is in place.
   Briefly tell me what restrictions/rules it sets, so I know they're active.

Do not proceed to Step 2 until the app builds successfully.

## Step 2 — My app idea (Blueprint)

Paste your Blueprint below. This already contains the problem, target user, value
proposition, and MVP scope from the BuilderLab process — use it as the source of truth for
what to **add on top of** the existing auth/billing/dashboard foundation (never rebuild that
foundation).

**Blueprint:**
[PASTE YOUR BLUEPRINT HERE]

If anything critical is missing or unclear from the Blueprint to actually build the feature
work (e.g. what the core objects/tables are, or whether the two demo pricing tiers fit the
idea as-is), ask me directly — but don't ask about things the Blueprint already answers, and
don't ask about auth/billing/email/i18n, since those already exist and work.

## Step 3 — Personalize, then build (all via MCP, several agents at once)

1. Run `/setup` first if it hasn't run yet — it personalizes the boilerplate (product name,
   branding, which pricing tiers to keep) for this Blueprint.
2. Based on the Blueprint, propose the data model (new tables/fields specific to this idea, on
   top of the existing auth/subscriptions schema) and set it up in Supabase using the Supabase
   MCP tools, following `.claude/skills/safe-migrations/SKILL.md` and
   `.claude/skills/supabase-security/SKILL.md`.
3. Propose the minimal set of new screens/pages needed to demonstrate the idea's core features,
   built inside the existing `(dashboard)` route group.
4. For anything non-trivial (a new feature area, not a one-off tweak), go through the OpenSpec
   propose → implement → archive loop (`.claude/CLAUDE.md` section 14) rather than improvising
   structure in chat.
5. **Run independent work in parallel.** Don't build one thing at a time: spawn several named
   background subagents **in a single message** and let them work simultaneously — for example
   one on the new Supabase schema + RLS policies, one on screen A, one on screen B. Section 16
   of `.claude/CLAUDE.md` has the full rules on what may run in parallel and what must not
   (same file, same table, package installs, and git operations always stay sequential).
6. Show me progress after each finished piece rather than doing everything silently, and tell
   me in plain language when several things are running at once.
7. Push code to GitHub using the GitHub MCP tools as you go, with clear commit messages.
8. Deploy to Vercel using the Vercel MCP tools once the new feature work is ready.

## Step 4 — Constraints

- The rules in the `.claude` folder always take priority — never bypass or work around them,
  even if it would be faster.
- This is a live workshop with limited time — prioritize a working, demoable feature over
  completeness or polish. The foundation (auth/billing/email/i18n/CI) is already done; spend
  the time on what's specific to this idea.
- Don't add features that aren't in the Blueprint.
- Explain what you're doing in plain, non-technical language as you go, since I don't have a
  coding background.
- Everything must go through the connected MCP tools (GitHub, Supabase, Vercel, Stripe). If
  something can't be done via MCP, stop and tell me exactly what's missing instead of
  improvising a manual workaround.
