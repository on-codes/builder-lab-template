## Why

The dashboard shell shipped in the first build with just a logo and an account-menu dropdown —
no actual navigation, no custom error/not-found pages (Next.js's bare defaults), and no
dedicated pass for small screens. **For a non-technical project owner**: every new page you
add from here on (the whole point of this template) now has somewhere to actually link to it,
a decent screen instead of a blank crash when something breaks, and a phone-sized layout that
doesn't fall apart — table stakes for any dashboard, not something you should have to ask for
again per feature.

## What Changes

- A responsive primary navbar: inline links on desktop, a slide-out menu (hamburger) on
  mobile — same links, same active-page highlighting, kept in one shared config so they can't
  drift apart.
- A skip-to-content link and a `<main id="main-content">` landmark for keyboard/screen-reader
  users.
- One consistent content container every dashboard page renders into (already existed for the
  outer width; this makes it the documented, load-bearing pattern rather than an incidental
  one).
- Friendly `error.tsx` boundaries (locale-wide, dashboard-scoped so the nav stays visible, and
  a root `global-error.tsx` for the worst case) and `not-found.tsx` pages (same three levels),
  all in plain English, never a raw stack trace.
- A `loading.tsx` skeleton for the dashboard segment.
- A responsive audit (verified with real screenshots at phone/tablet/desktop widths, not just
  assumed from class names) across the marketing/auth pages and the two settings screens, with
  fixes applied where anything broke.

## Capabilities

### New Capabilities

- `dashboard-shell`: the authenticated app's navigation chrome, content container, and
  error/not-found handling — the load-bearing UI every future dashboard page sits inside.

### Modified Capabilities

_(none — this is UI/navigation structure, not a change to auth, billing, or data access; no
existing requirement in `add-auth-foundation` or `add-stripe-billing` changes)_

## Impact

- New: `app/[locale]/dashboard/{dashboard-nav,mobile-nav,nav-links,loading}.tsx`,
  `components/ui/sheet.tsx`, `app/[locale]/error.tsx`, `app/[locale]/dashboard/error.tsx`,
  `app/[locale]/global-error.tsx` (or `app/global-error.tsx`, whichever level Next.js's
  root-layout-error convention requires), `app/[locale]/not-found.tsx`,
  `app/[locale]/dashboard/not-found.tsx`, `app/not-found.tsx`.
- Changed: `app/[locale]/dashboard/layout.tsx` (navbar + skip link + landmark), `user-menu.tsx`
  (drops its now-redundant Settings item now Settings is a first-class nav link),
  `components/ui/dialog.tsx` (translates a hardcoded "Close" string it already had — caught
  while building the same pattern for the new Sheet component).
- No schema change, no new dependency (Sheet is hand-authored on the `@radix-ui/react-dialog`
  package already installed for Dialog), no auth/billing/RLS surface touched.
