#!/usr/bin/env bash
# PreToolUse hook (matcher: Bash). Reads the tool call as JSON on stdin, per Claude Code's
# hook spec: { "tool_name": "Bash", "tool_input": { "command": "..." }, ... }
# Exit code 2 blocks the command and returns stderr to Claude as feedback.
# Exit code 0 allows it through.
set -euo pipefail

INPUT_JSON="$(cat)"
COMMAND="$(echo "$INPUT_JSON" | jq -r '.tool_input.command // empty')"
HOOKS_DIR="$(dirname "$0")"

if [ -z "$COMMAND" ]; then
  exit 0
fi

# Any commit or push: scan for secrets first, always.
if echo "$COMMAND" | grep -qE 'git (commit|push)'; then
  if ! "$HOOKS_DIR/check-secrets.sh" 1>&2; then
    echo "Blocked by the secrets hook — see the output above and fix it before trying again." >&2
    exit 2
  fi
fi

# Push specifically: full gate (secrets + migrations + lint + format + tests).
if echo "$COMMAND" | grep -qE 'git push'; then
  if ! "$HOOKS_DIR/pre-push-checks.sh" 1>&2; then
    echo "Blocked by the pre-push hook — fix the items listed above before pushing." >&2
    exit 2
  fi
fi

exit 0
