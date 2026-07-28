---
description: Asks the initial questions and builds the project skeleton (web or mobile) from this template.
---

You are starting a new project from the BuilderLab Template. Before writing any code:

1. If you don't know yet, ask the person directly, in plain English:
   "Do you want to build a **website/dashboard (web)** or a **mobile app**?"
   And also: "In one sentence, what is the idea you want to validate?"

   Before running anything, make sure pnpm is available — this template's only package
   manager. Run `corepack enable pnpm` if `pnpm --version` fails.

2. Depending on the answer:
   - **Web**: run
     `pnpm create next-app@latest . --typescript --tailwind --app --eslint=false --use-pnpm`
     in the project directory, then add shadcn/ui (`pnpm dlx shadcn@latest init`) and TanStack
     Query (`pnpm add @tanstack/react-query`). Copy the reference files from
     `stacks/web/` to the root (`.env.example`, Supabase client config, etc.).
   - **Mobile**: run `pnpm create expo-app@latest . --template blank-typescript --no-install`
     (note `--no-install`), then create an `.npmrc` at the root containing
     `node-linker=hoisted` — React Native's bundler can't follow pnpm's default symlinked
     `node_modules`, so that line has to be in place *before* the first install — and only
     then run `pnpm install`. Add NativeWind
     (`pnpm exec expo install nativewind tailwindcss`) and TanStack Query. Copy the reference
     files from `stacks/mobile/`. Commit the `.npmrc`; EAS builds need it too.

3. In both cases:
   - Run `pnpm --version` and add that exact version to `package.json` as
     `"packageManager": "pnpm@X.Y.Z"`.
     This is what pins the same pnpm version on the person's machine, in CI, and on Vercel.
   - Commit `pnpm-lock.yaml` (never `package-lock.json` or `yarn.lock`).
   - Install `oxlint` and `oxfmt` (`pnpm add -D oxlint oxfmt`) and add the scripts
     `lint`, `lint:fix`, `format`, `format:fix` to `package.json` (see
     `.claude/skills/code-quality/SKILL.md`).
   - Install `vitest` (`pnpm add -D vitest`) and configure the `test`/`test:watch` scripts
     (see `.claude/skills/testing/SKILL.md`).
   - Create `supabase/migrations/` if it doesn't exist yet, with the first migration creating
     the initial tables already with RLS enabled (see `.claude/skills/supabase-security/SKILL.md`
     and `.claude/skills/safe-migrations/SKILL.md`).
   - Copy `.env.example` to `.env.local` (web) or configure the Expo secrets (mobile) and
     explain to the person, in 3-4 simple steps, where they can get the real keys (Supabase
     dashboard → Project Settings → API; Stripe dashboard → Developers → API keys).
   - Confirm that `.mcp.json` is present at the root and ask whether the 4 MCPs (GitHub,
     Vercel, Supabase, Stripe) are already connected; if not, explain how to connect each one.

4. Finish with a short summary of what was created and the suggested next step (e.g.
   "create the first screen" or "define the first database table").

Never skip the question in step 1 — mixing the two stacks in the same project breaks this
template's conventions.
