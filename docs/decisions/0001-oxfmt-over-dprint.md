# 1. Use oxfmt, not dprint, for formatting

**Status**: Accepted

## Context

The build spec calls for oxlint (replacing ESLint) and, for formatting, either oxfmt or a
fallback to dprint if oxfmt "is not stable enough yet."

## Decision

Use `oxfmt` (currently 0.x, pre-1.0 but functional). Verified during Phase 1: it formats
TypeScript/TSX, JSON, and Markdown consistently, runs in well under a second across the whole
repo, and integrates cleanly with the existing pre-commit/pre-push hooks
(`.claude/hooks/run-lint-format.sh`, `.claude/hooks/pre-push-checks.sh`), which already
targeted `oxfmt` before this build started.

## Consequences

- `.oxfmtrc.json` and `.oxlintrc.json` pin explicit configuration rather than relying on
  version-specific defaults.
- If oxfmt's pre-1.0 status causes real problems later (breaking formatting changes between
  minor versions, an unfixable bug), the fallback is dprint — swap the `format`/`format:check`
  scripts and the two hook scripts that call `oxfmt` directly; nothing else in the codebase
  depends on oxfmt specifically.
