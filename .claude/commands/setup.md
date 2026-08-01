---
description: Asks the initial question and builds the web dashboard skeleton from this template.
---

You are starting a new project from the BuilderLab Template. This template builds **one thing:
a web dashboard** (Next.js + TypeScript + shadcn/ui + TanStack Query, deployed on Vercel).
Don't ask which platform — there is no mobile track. If the person asks for a mobile app,
explain that this template doesn't cover it and offer to build the dashboard instead.

## 1. Ask the one question that matters

Ask the person, in plain English:

> "In one sentence, what is the idea you want to validate?"

## 2. Check the tools before running anything

- `node --version` must be **24 or newer** (Node 24 is the current LTS, and what CI and
  Vercel use). If it's older, stop and ask the person to install Node 24 LTS from nodejs.org —
  it's the one step you can't do for them.
- `pnpm --version` must be **11.18.0 or newer**. If the command fails or prints something
  older, fix it yourself with:
  `corepack enable pnpm && corepack prepare pnpm@11.18.0 --activate`

pnpm is this template's only package manager — never `npm`, never `yarn`.

## 3. Scaffold (sequential — nothing else runs during this)

The scaffold owns the whole directory, and package installs can't overlap, so these two steps
run alone, one after the other:

1. `pnpm create next-app@latest . --typescript --tailwind --app --eslint=false --use-pnpm`
2. One single install for everything the template needs (one command, not four — parallel or
   back-to-back installs risk corrupting `pnpm-lock.yaml`):
   `pnpm add @tanstack/react-query && pnpm add -D oxlint oxfmt vitest`
   Then initialise shadcn/ui: `pnpm dlx shadcn@latest init`

## 4. Wire it up (three agents at once)

Now that `node_modules` exists and nothing else needs installing, spawn these three subagents
**in a single message**, each with `run_in_background: true` and a name. They touch disjoint
files, so they're safe to run together (see section 12 of `.claude/CLAUDE.md`):

- **`tooling`** — owns `package.json` (nobody else edits it this round) and the tool configs.
  Adds the `lint`, `lint:fix`, `format`, `format:fix` scripts
  (`.claude/skills/code-quality/SKILL.md`) and the `test`/`test:watch` scripts plus the Vitest
  config (`.claude/skills/testing/SKILL.md`). Also adds
  `"engines": { "node": ">=24", "pnpm": ">=11.18.0" }` and sets
  `"packageManager": "pnpm@X.Y.Z"` to the exact output of `pnpm --version` — that's what pins
  the same pnpm on the person's machine, in CI, and on Vercel.
- **`data`** — copies the reference files from `stacks/web/` into place (Supabase clients,
  `middleware.ts`, `lib/rate-limit.ts`) and creates `supabase/migrations/` if missing, with the
  first migration creating the initial tables **with RLS enabled from the start**
  (`.claude/skills/supabase-security/SKILL.md` and `.claude/skills/safe-migrations/SKILL.md`).
- **`env`** — copies `stacks/web/.env.example` to the root as `.env.example` and to
  `.env.local`, confirms `.mcp.json` is at the root, and writes out (for you to relay) the
  simple steps to get the real keys: Supabase dashboard → Project Settings → API. Never fills
  in a real key itself. The Stripe block in `.env.example` stays empty — payments are off by
  default (section 8 of `.claude/CLAUDE.md`), so never ask the person for Stripe keys during
  setup.

## 5. Verify the combined result (you, not the agents)

Wait for all three to report back, then run the checks yourself on the merged result:

- `pnpm exec oxlint .` and `pnpm exec oxfmt --check .`
- `pnpm test`
- `bash .claude/hooks/check-secrets.sh`

Fix anything that fails before moving on. An agent saying "done" isn't verification — the
checks passing is. Commit `pnpm-lock.yaml` (never `package-lock.json` or `yarn.lock`).

## 6. Wrap up

Ask whether the 3 MCPs (GitHub, Vercel, Supabase) are connected; if not, explain how to
connect each one. Don't mention Stripe — nobody needs a Stripe account to build here, and
payments only come up if the idea actually charges money. Then give a short summary of what was created and the suggested next step
(e.g. "create the first screen" or "define the first database table"), in plain English.
