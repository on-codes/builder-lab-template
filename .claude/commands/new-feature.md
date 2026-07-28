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
3. **Implement** following the project's stack (Next.js or Expo, as already defined in
   `/setup`). Validate every input with Zod. Apply rate limiting if it's a public route
   (`.claude/skills/app-security/SKILL.md`).
4. **Test**: write the unit test for the feature (`.claude/skills/testing/SKILL.md`) and run it
   until it passes.
5. **Quality**: run lint + format (`.claude/skills/code-quality/SKILL.md`) — the hook already
   does this automatically on every edit, but confirm before the commit.
6. **Commit**: short, descriptive message (follow the convention already used in the
   repository). The secret-scanning hook runs automatically.
7. **Summarize** for the person, in 2-3 simple sentences, what was done and what they can test
   now.

Don't mark the task as complete if any test is failing or if lint/format isn't clean.
