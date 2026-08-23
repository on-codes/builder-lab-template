---
description: Investigates and fixes a broken Vercel deploy using the Vercel MCP, without needing technical help from the person.
---

Follow `.claude/skills/vercel-ops/SKILL.md` from start to finish:

1. Use the Vercel MCP to find the project's latest failed deployment.
2. Pull that deployment's build and runtime logs.
3. Compare the error against the skill's table of common causes and apply the standard fix.
4. Run the full local check (lint, format, typecheck, tests) before committing.
5. Commit and push the fix (the pre-push hook runs on its own).
6. Track it via MCP until the new deployment reaches `READY`.
7. Tell the person in 2-3 simple sentences: what broke and what was fixed. Only ask them for a
   manual action if it requires a secret only they have access to (e.g. pasting a new key into
   the Vercel dashboard) — in that case, give the exact step-by-step.
