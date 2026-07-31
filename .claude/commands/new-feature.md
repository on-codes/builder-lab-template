---
description: Standard flow for building a new feature from start to finish (code + security + tests + commit).
argument-hint: [short description of the feature]
---

Requested feature: $ARGUMENTS

Follow this order, without skipping steps:

1. **Understand the request** by restating it in 1-2 sentences back to the person, in plain
   English, before coding — confirm what is going to be built.
2. **Schema (if a new table/column is needed)**: follow
   `.claude/skills/safe-migrations/SKILL.md` and `.claude/skills/supabase-security/SKILL.md`.
   Every new table is born with RLS + policies.
3. **Implement** following the project's stack (Next.js App Router, as set up by `/setup`).
   Validate every input with Zod. Apply rate limiting if it's a public route
   (`.claude/skills/app-security/SKILL.md`).
   If the feature spans two or more independent files or screens, split it across named
   background subagents spawned in a single message — one per file, no overlap (section 12 of
   `.claude/CLAUDE.md`). Anything touching the same file, `package.json`, or the same table
   stays with a single agent.
4. **Test + security review, in parallel**: once the code exists, run these two at the same
   time — one agent writing the unit test for the feature
   (`.claude/skills/testing/SKILL.md`) and the `security-reviewer` agent going over the change.
   Then run the test yourself until it passes.
5. **Quality**: run lint + format (`.claude/skills/code-quality/SKILL.md`) — the hook already
   does this automatically on every edit, but confirm before the commit. Never trust a
   subagent's "done" as verification; the checks passing is the verification.
6. **Commit**: short, descriptive message (follow the convention already used in the
   repository). The secret-scanning hook runs automatically.
7. **Summarize** for the person, in 2-3 simple sentences, what was done and what they can test
   now.

Don't mark the task as complete if any test is failing or if lint/format isn't clean.
