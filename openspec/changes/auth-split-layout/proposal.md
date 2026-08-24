## Why

Every unauthenticated screen (login, signup, forgot/reset password, MFA code entry) currently
renders as a single centered card on a blank page — functional, but it says nothing about the
product someone is signing up for. **For a non-technical project owner**: this change only
touches how those screens look, not how they work — nobody's email, password, session, or MFA
handling changes, and no new sign-in method is added. The person building on this template
shared a reference screenshot of a split-screen auth layout (a form on one side, a branded panel
on the other) and asked for that same structure here — using this template's own colors and
copy, not the reference site's.

## What Changes

- A new branded showcase panel (`AuthShowcase`) sits beside the form on every auth screen: the
  product name, the same headline/subheading already on the marketing homepage, and the same
  four feature highlights already on the marketing homepage (secure login, billing, dashboard,
  i18n) — reused from `Marketing.Home` in the message catalog, not duplicated or invented, so
  the homepage and the auth screens always tell the same product story.
- `(auth)/layout.tsx` becomes a two-column shell at the `lg` breakpoint and up: the existing form
  column on the left, `AuthShowcase` on the right. Below that breakpoint, only the form shows —
  unchanged from today's behavior.
- None of the five form components (login, signup, forgot-password, reset-password, verify-mfa)
  change at all — same fields, same validation, same Server Actions, same existing tests. This
  is a shell change around them, not a change to them.
- Fixes a small pre-existing inconsistency while this file is already being touched: the brand
  link in `(auth)/layout.tsx` was a hardcoded `"BuilderLab"` string instead of reading
  `Common.appName` the way the marketing header already does — now both read from the same
  catalog entry.
- Deliberately does **not** add the reference screenshot's "Continue with Google" button or
  "Remember me" checkbox. This template's supported auth methods are email+password and email
  MFA only (`.claude/CLAUDE.md` §1/§9) — a real Google sign-in option is a new provider
  integration, and a working remember-me control is new session behavior; neither is a layout
  change. Copying the reference's visual controls without the working feature behind them would
  mislead whoever uses this template.

## Capabilities

### New Capabilities

- `auth-shell`: the unauthenticated app's shared layout — the two-column shell and the branded
  showcase panel every auth screen sits inside. Mirrors how `dashboard-shell` (see the
  `dashboard-shell-ux` change) already covers the authenticated app's chrome.

### Modified Capabilities

_(none — this is presentation/layout only. Nothing in `add-auth-foundation`'s `authentication`
spec changes: no new auth method, no change to validation, sessions, MFA, or rate limiting. No
`design.md` for the same reason `dashboard-shell-ux` didn't need one — see its proposal.md.)_

## Impact

- New: `app/[locale]/(auth)/auth-showcase.tsx`, `app/[locale]/(auth)/auth-showcase.test.tsx`,
  `app/[locale]/(auth)/layout.test.tsx`.
- Changed: `app/[locale]/(auth)/layout.tsx` (two-column shell, `Common.appName` instead of a
  hardcoded string).
- No new dependency (reuses `lucide-react`, already installed for the marketing page), no new
  i18n keys (reuses `Common.appName` and `Marketing.Home.*`), no schema change, no auth/billing/
  RLS surface touched.
