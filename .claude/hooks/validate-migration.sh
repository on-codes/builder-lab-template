#!/usr/bin/env bash
# Blocks destructive migrations from reaching the remote unless explicitly allowed.
# See .claude/skills/safe-migrations/SKILL.md for the reasoning.
set -euo pipefail

MIGRATIONS_DIR="supabase/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  exit 0
fi

# New/changed migration files compared to the last pushed state on origin/main.
CHANGED_FILES="$(git diff --name-only origin/main...HEAD -- "$MIGRATIONS_DIR" 2>/dev/null || true)"

if [ -z "$CHANGED_FILES" ]; then
  exit 0
fi

DESTRUCTIVE_PATTERN='(drop[[:space:]]+table|drop[[:space:]]+column|alter[[:space:]]+column.*type|rename[[:space:]]+(column|table)|truncate)'

FOUND=0
while IFS= read -r file; do
  [ -f "$file" ] || continue
  # Walk line by line so we can check for an ALLOW-DESTRUCTIVE comment directly above.
  awk -v pat="$DESTRUCTIVE_PATTERN" '
    BEGIN { IGNORECASE=1 }
    {
      # Only the executable part of the line counts: a migration that merely *mentions*
      # "truncate" or "drop column" in an explanatory comment is not destructive, and
      # blocking it teaches people to distrust this check. Real statements still match.
      code = $0
      sub(/--.*/, "", code)
      if (code ~ pat) {
        if (prev !~ /ALLOW-DESTRUCTIVE/) {
          print FILENAME ":" FNR ": " $0
        }
      }
      prev = $0
    }
  ' "$file" > /tmp/destructive_hits.$$ || true

  if [ -s /tmp/destructive_hits.$$ ]; then
    echo "❌ Destructive command without approval in $file:"
    cat /tmp/destructive_hits.$$
    FOUND=1
  fi
  rm -f /tmp/destructive_hits.$$
done <<< "$CHANGED_FILES"

if [ "$FOUND" -eq 1 ]; then
  echo ""
  echo "🚫 Push blocked: migrations must be additive only (CREATE TABLE / ADD COLUMN /"
  echo "   CREATE INDEX / CREATE POLICY). If this is intentional and the person confirmed the"
  echo "   risk and a rollback plan, add a '-- ALLOW-DESTRUCTIVE: <reason>' comment"
  echo "   directly above the statement."
  exit 1
fi

exit 0
