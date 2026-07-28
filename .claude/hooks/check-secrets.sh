#!/usr/bin/env bash
# Blocks commit/push if something that looks like a secret is about to be committed.
# Wired as a PreToolUse hook matching Bash commands containing "git commit" or "git push".
set -euo pipefail

STAGED_DIFF="$(git diff --cached 2>/dev/null || true)"
UNSTAGED_TRACKED_DIFF="$(git diff 2>/dev/null || true)"
COMBINED="${STAGED_DIFF}
${UNSTAGED_TRACKED_DIFF}"

# Patterns for common secret shapes. Keep this list boring and maintainable.
PATTERNS=(
  'sk_live_[A-Za-z0-9]{10,}'
  'sk_test_[A-Za-z0-9]{10,}'
  'pk_live_[A-Za-z0-9]{10,}'
  'whsec_[A-Za-z0-9]{10,}'
  'SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^ \n]{10,}'
  'eyJhbGciOi[A-Za-z0-9_\-\.]{20,}'   # JWT-shaped strings
  'AKIA[0-9A-Z]{16}'                    # AWS access key id
  '-----BEGIN [A-Z ]*PRIVATE KEY-----'
)

FOUND=0
for pattern in "${PATTERNS[@]}"; do
  # `--` matters: without it, the private-key pattern starts with "-----" and grep
  # would read it as command-line flags instead of as a pattern.
  if echo "$COMBINED" | grep -E -q -- "$pattern"; then
    echo "❌ Possible secret found in the diff (pattern: $pattern)."
    FOUND=1
  fi
done

# Also block committing any real .env file (only .env.example is allowed).
if git diff --cached --name-only | grep -E '(^|/)\.env($|\.[^e][^x][^a][^m][^p][^l][^e].*$)' >/dev/null 2>&1; then
  echo "❌ A .env file (not .env.example) is being committed."
  FOUND=1
fi

if [ "$FOUND" -eq 1 ]; then
  echo ""
  echo "🚫 Commit/push blocked. Move the value into an environment variable in .env.local"
  echo "   (git-ignored) and reference it from the code instead of writing it inline."
  exit 1
fi

exit 0
