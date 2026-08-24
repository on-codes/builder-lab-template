---
description: Standard flow for building a new feature from start to finish (code + security + tests + commit).
argument-hint: [short description of the feature]
---

Requested feature: $ARGUMENTS

Follow this order, without skipping steps:

1. **Understand the request** by restating it in 1-2 sentences back to the person, in plain
   English, before coding — confirm what is going to be built.

   Before implementing: if this feature adds a new table, or touches auth/billing/RLS
   behavior, run the OpenSpec propose step first (`.claude/CLAUDE.md` section 14) so the
   change is documented before it's built. A small addition to an existing screen/route
   doesn't need the full ceremony — use judgment.

2. **Schema (if a new table/column is needed)**: follow
   `.claude/skills/safe-migrations/SKILL.md` and `.claude/skills/supabase-security/SKILL.md`.
   Every new table is born with RLS + policies.
3. **Implement** using the project's stack: Next.js App Router, TypeScript, shadcn/ui +
   Tailwind, TanStack Query, and Supabase. Validate every input with Zod. Apply rate limiting
   if it's a public route (`.claude/skills/app-security/SKILL.md`).
   If the feature spans two or more independent files or screens, split it across named
   background subagents spawned in a single message — one per file, no overlap (section 16 of
   `.claude/CLAUDE.md`). Anything touching the same file, `package.json`, or the same table
   stays with a single agent.
4. **Test + security review, in parallel**: once the code exists, run these two at the same
   time — one agent writing the unit test for the feature
   (`.claude/skills/testing/SKILL.md`) and the `security-reviewer` agent going over the change.
   New user-facing strings belong in the i18n message catalog (`messages/en.json`), never
   hardcoded text (`.claude/CLAUDE.md` section 10) — check for that too. Then run the test
   yourself until it passes.
5. **Quality**: run lint, format, and typecheck (`.claude/skills/code-quality/SKILL.md`,
   `pnpm typecheck`) — the lint/format hook already runs automatically on every edit, but
   confirm all three before the commit. Never trust a subagent's "done" as verification; the
   checks passing is the verification.
6. **Commit**: short, descriptive message (follow the convention already used in the
   repository). The secret-scanning hook runs automatically.
7. **Summarize** for the person, in 2-3 simple sentences, what was done and what they can test
   now.

Don't mark the task as complete if any test is failing, if typecheck fails, or if lint/format
isn't clean.
