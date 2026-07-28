---
name: code-quality
description: Use this skill whenever you're about to commit, push, or open a PR, or whenever you finish editing a JS/TS file. Runs and enforces oxlint (linting) and oxfmt (formatting) so the codebase stays consistent without the person ever needing to think about it.
---

# Code Quality — oxlint + oxfmt

This template uses the Oxc toolchain (Rust-based, very fast) instead of ESLint/Prettier:
`oxlint` for linting, `oxfmt` for formatting.

## Commands

```bash
# Lint
pnpm exec oxlint .            # check
pnpm exec oxlint --fix .      # auto-fix what's fixable

# Format
pnpm exec oxfmt --check .     # check
pnpm exec oxfmt .             # write formatted files
```

`pnpm` is this template's only package manager — never run `npm`, `npx`, or `yarn` here
(they would create a second lockfile and CI would stop matching your machine). `pnpm exec`
runs a binary already installed in `node_modules`; `pnpm dlx` is the equivalent of `npx` for
a one-off tool that isn't a dependency.

`package.json` scripts (both web and mobile stacks):

```json
{
  "scripts": {
    "lint": "oxlint .",
    "lint:fix": "oxlint --fix .",
    "format": "oxfmt --check .",
    "format:fix": "oxfmt ."
  }
}
```

## When this runs

1. **After every file edit** — the `PostToolUse` hook (`.claude/hooks/run-lint-format.sh`)
   auto-runs `oxlint --fix` and `oxfmt` on the file(s) just touched, so drift never
   accumulates.
2. **Before every push** — `.claude/hooks/pre-push-checks.sh` runs the full-repo `lint`,
   `format`, and `test` scripts. A push is blocked if any of them fail.
3. **In CI** — `.github/workflows/ci.yml` re-runs the same checks on every PR so a red check
   is visible before merge, even if a hook was somehow bypassed.

## Claude's responsibility

Never tell the person "there's a lint error, please fix it." Fix it yourself, re-run the
check, and only report completion once it's clean. If `oxlint`/`oxfmt` flag something you
disagree with stylistically, follow the tool anyway — consistency for a non-technical owner
matters more than personal preference.
