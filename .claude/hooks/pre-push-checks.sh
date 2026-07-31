#!/usr/bin/env bash
# Full gate before anything reaches the remote. Wired as a PreToolUse hook matching
# Bash commands containing "git push". Blocks the push (non-zero exit) if any step fails.
set -euo pipefail

echo "🔎 1/4 — Checking for secrets..."
"$(dirname "$0")/check-secrets.sh"

echo "🔎 2/4 — Validating migrations (additive only)..."
"$(dirname "$0")/validate-migration.sh"

if [ -f package.json ]; then
  # pnpm is this template's only package manager (see .claude/CLAUDE.md section 1).
  MIN_PNPM="11.18.0"
  if ! command -v pnpm >/dev/null 2>&1; then
    echo "🚫 pnpm is not installed, so lint/format/tests can't run."
    echo "   Fix it with one command:  corepack enable pnpm && corepack prepare pnpm@$MIN_PNPM --activate"
    exit 1
  fi

  # Older pnpm versions resolve the lock file differently, so CI and Vercel would stop
  # matching this machine. Refuse to push rather than let that drift through.
  PNPM_VERSION="$(pnpm --version)"
  if [ "$(printf '%s\n%s\n' "$MIN_PNPM" "$PNPM_VERSION" | sort -V | head -n1)" != "$MIN_PNPM" ]; then
    echo "🚫 pnpm $PNPM_VERSION is too old — this template needs $MIN_PNPM or newer."
    echo "   Fix it with one command:  corepack prepare pnpm@$MIN_PNPM --activate"
    exit 1
  fi

  echo "🔎 3/4 — Lint + format..."
  pnpm exec oxlint . || { echo "🚫 oxlint found problems."; exit 1; }
  pnpm exec oxfmt --check . || { echo "🚫 oxfmt found unformatted files. Run: pnpm exec oxfmt ."; exit 1; }

  echo "🔎 4/4 — Tests..."
  pnpm test || { echo "🚫 Tests failing. Push blocked until everything passes."; exit 1; }
fi

echo "✅ All good — safe to push to the remote repository."
exit 0
