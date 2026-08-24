# Guardrails

Things Claude must never do unattended in this repository — "unattended" meaning without the
person (or, mid-session, an explicit `AskUserQuestion` answer) confirming first. This file is
the concrete list; `.claude/CLAUDE.md` has the reasoning and the day-to-day workflow.

## Never do these without explicit, out-loud confirmation first

- **Rotate or regenerate a secret** (Supabase keys, Stripe keys, Resend API key, any token) —
  even to "fix" a broken deploy. Diagnose and report; let the person decide, since rotating a
  live key can break other things they haven't mentioned.
- **Switch any Stripe key from test to live**, or change a **live** Stripe price/product ID.
  Test-mode changes are fine; anything touching real money needs the person to say so.
- **Modify an RLS policy** on a table that already has data in a real (non-local) environment
  without flagging exactly what access changes and why. Adding a new policy to a new table
  needs no confirmation (see `.claude/skills/safe-migrations/SKILL.md`); loosening or removing
  an existing one does.
- **Delete a migration file**, applied or not. If a migration was wrong, write a new additive
  migration that corrects it (see `.claude/skills/safe-migrations/SKILL.md`) — never remove
  history that Supabase's migration runner has already tracked.
- **Run a destructive migration** (`DROP TABLE`/`COLUMN`, `ALTER COLUMN ... TYPE`,
  `RENAME COLUMN/TABLE`, `TRUNCATE`) without a written rollback plan and the person's explicit
  confirmation that they understand the risk. `.claude/hooks/validate-migration.sh` blocks
  these by default; the only way past it is a `-- ALLOW-DESTRUCTIVE: <reason>` comment Claude
  adds _after_ that confirmation, never before or in its place.
- **Disable or bypass a hook** (`git commit --no-verify`, editing `.claude/settings.json` to
  remove a hook, commenting out a check) to get past a failure. Fix the underlying problem
  instead. If a hook itself seems wrong, say so and ask — don't route around it silently.
- **Push force**, rewrite shared history, or delete a branch other than the one Claude is
  actively working on.
- **Merge a PR with red CI**, or tell the person something is "ready" while a check is failing.

## OpenSpec-specific guardrails

- Never start implementing a change that touches auth, billing, or RLS from a bare
  `proposal.md` — those three areas require a `design.md` too (`.claude/CLAUDE.md` section 14).
- Never write a delta spec `MODIFIED` operation that replaces a requirement's text without
  showing what the requirement said before. A `MODIFIED` header is an edit, not a silent
  rewrite — losing the previous scenarios is data loss.
- Never skip the scenario requirement ("every requirement needs at least one
  `#### Scenario:` block") to move faster. A proposal without scenarios isn't reviewable, so
  it isn't a proposal yet.
- Never treat writing the proposal as the same event as it being reviewed. For solo,
  asynchronous work, reasoning through the plain-English summary yourself and proceeding is
  an acceptable stand-in _only_ when nothing is destructive, ambiguous, or in the
  confirm-first list above — otherwise, stop and ask.

## What Claude should always do instead

- Explain the tradeoff or risk in plain English, propose the safe alternative, and wait.
- When blocked on a decision only the person can make, use `AskUserQuestion` rather than
  guessing — but only for decisions that actually change the outcome; don't ask about things
  covered elsewhere in this file or in `.claude/CLAUDE.md`.
- When something in this list is genuinely necessary (e.g. a key really did leak and must be
  rotated), say exactly what needs to happen and who needs to do which part — Claude can
  usually do the code-side half; the account-holder action (clicking "roll key" in a
  dashboard, confirming a live charge) stays theirs.
