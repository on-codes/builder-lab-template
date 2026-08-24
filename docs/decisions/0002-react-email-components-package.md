# 2. Use `@react-email/components` + `@react-email/render`, not the unified `react-email` package, for template source

**Status**: Accepted

## Context

Resend consolidated the individual `@react-email/*` component packages into one unified
`react-email` package; `@react-email/components` now carries an npm deprecation notice
("Package no longer supported"). At the same time, the unified package's main entry point
pulls in its CLI/dev-server dependency tree (esbuild, chokidar, socket.io, prismjs, marked,
tailwindcss, commander, ...) via top-level imports — confirmed by inspecting its
`package.json`, which has a single, un-scoped `exports` entry with no lighter subpath. This is
a known, currently-open problem (resend/react-email#3556): importing components from the
unified package into files that get bundled for serverless functions has caused ~80MB bundle
bloat and silent deploy hangs on Vercel specifically — this template's deploy target.

## Decision

- `emails/**/*.tsx` (the actual template source, bundled into whatever imports it —
  ultimately a Vercel serverless function via `lib/email/send.ts`) import components from
  `@react-email/components`. It's deprecated but still fully functional, and critically,
  scoped — it doesn't drag in dev-tooling dependencies.
- Rendering to HTML (`lib/email/send.ts`, and every template's render-to-string test) uses
  `@react-email/render` directly — not deprecated, not part of the unified package, and
  reasonably lean.
- The unified `react-email` package stays a devDependency, used ONLY for its CLI
  (`pnpm email:dev`, the local preview server) — never imported from template source.

## Consequences

- A future `pnpm outdated`/security-audit pass will flag `@react-email/components` as
  deprecated. That's expected; don't "fix" it by switching template imports to the unified
  package without first confirming resend/react-email#3556 (or its successor) is resolved
  upstream and the bundle-size regression is gone.
- If `@react-email/components` is ever pulled from npm entirely (deprecated ≠ unpublished, but
  it's a real risk for an unmaintained package), revisit this decision then — pin the exact
  installed version in the meantime via the committed lockfile, which already happens
  automatically.
