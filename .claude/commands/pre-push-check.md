---
description: Manually runs the full check (secrets, migrations, lint, format, typecheck, tests) before a push.
---

Run these in order, and fix any failure before moving on to the next step:

1. `bash .claude/hooks/check-secrets.sh`
2. `bash .claude/hooks/validate-migration.sh`
3. `pnpm exec oxlint .`
4. `pnpm exec oxfmt --check .`
5. `pnpm typecheck`
6. `pnpm test`

If everything passes, tell the person it's ready to push. If something fails, fix the problem
yourself (never ask the person to solve it) and run the check again from scratch.
