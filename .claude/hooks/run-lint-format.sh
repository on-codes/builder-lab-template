#!/usr/bin/env bash
# PostToolUse hook (matcher: Write|Edit|MultiEdit). Reads the tool call as JSON on stdin
# and auto-runs oxlint --fix + oxfmt on the file that was just touched.
# PostToolUse can't block (the edit already happened) — this only cleans up after it.
set -euo pipefail

INPUT_JSON="$(cat)"
FILE_PATH="$(echo "$INPUT_JSON" | jq -r '.tool_input.file_path // empty')"

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.json)
    ;;
  *)
    exit 0
    ;;
esac

if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# pnpm exec only runs binaries already installed in node_modules — it never downloads
# anything, so this stays fast and offline-safe. If pnpm or the tools aren't there yet
# (e.g. before /setup has run), we simply do nothing.
if command -v pnpm >/dev/null 2>&1; then
  pnpm exec oxlint --fix "$FILE_PATH" >/dev/null 2>&1 || true
  pnpm exec oxfmt "$FILE_PATH" >/dev/null 2>&1 || true
fi

exit 0
