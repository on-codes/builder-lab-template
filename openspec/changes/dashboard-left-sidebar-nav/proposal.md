## Why

The person building on this template asked for the dashboard's navigation to look like a
reference screenshot they shared: a persistent panel down the **left** side of the screen,
with grouped/nested links and the account menu anchored at the bottom — the standard SaaS
admin layout — instead of today's top header bar (logo + two links + an account icon). The
reference was a screenshot of a different product's demo dashboard (its own example sections
like "Pipelines" or "Resources" don't exist in this template), so this proposal applies the
same **layout pattern** — a left sidebar, a grouped/nested menu, a bottom account row — to
this template's own real navigation (Dashboard, Settings → Security/Billing), not the
reference's example content.

**For a non-technical project owner**: this only changes where the navigation lives on
screen, not what it does. Every link that worked before still works and goes to the same
place; sign-out is still one click away. Nothing about login, billing, or your data changes.

## What Changes

- Desktop dashboard navigation moves from an inline row of links in a top header to a
  persistent left sidebar. "Settings" becomes an expandable group in the sidebar showing its
  two sub-pages (Security, Billing) nested underneath, instead of the separate tab strip
  those two pages currently show inside their own content area — the sidebar becomes the one
  place that navigation lives, instead of two.
- The account menu (avatar, email, sign out) moves from the top-right of the header into a
  row pinned at the bottom of the sidebar. Same menu contents, same "Sign out" action, new
  location.
- Mobile keeps today's slide-out panel behavior (a menu button opens an overlay with the same
  links, closes on selection) — now produced by the same sidebar component instead of a
  separate hand-built mobile nav, so desktop and mobile can no longer drift out of sync with
  each other.
- The sidebar can be collapsed to a narrow icon-only rail and back (a small toggle button, or
  a keyboard shortcut), and remembers that choice the next time the same browser loads the
  dashboard.
- Two new general-purpose pieces are added to the shared UI library — a `Sidebar` primitive
  and a `Tooltip` primitive (used to label icons when the sidebar is collapsed) — so any
  future screen in this template can reuse them, not just this one.
- The top header bar is removed on desktop (the sidebar replaces it). A slim bar stays at the
  top of the content area only to hold the sidebar's collapse/expand control.

## Capabilities

### New Capabilities

_(none — this restructures how the existing dashboard chrome is presented; it doesn't
introduce a capability that didn't exist before)_

### Modified Capabilities

- `dashboard-shell`: the "Primary navigation is reachable at every screen size" requirement
  changes from "inline links in a header" to "a persistent left sidebar", including how the
  active Settings sub-page is indicated. One new requirement is added for the
  collapse-and-remember behavior described above. Every other requirement in this capability
  (skip link, friendly errors, friendly not-found, responsive layout) is unaffected — Next.js
  keeps the dashboard's `layout.tsx` (and therefore the new sidebar) mounted around those
  pages already, so nothing about them needs to change.

  Note for whoever reviews this next: `dashboard-shell`'s own originating change
  (`dashboard-shell-ux`) was finished but never archived into `openspec/specs/`, so there is
  no living spec file to diff against yet. This proposal's delta is written against that
  change's spec (`openspec/changes/dashboard-shell-ux/specs/dashboard-shell/spec.md`), the
  most recent version of that requirement on disk. Archiving the older change is pre-existing
  housekeeping, not something this change takes on.

## Impact

- New: `components/ui/sidebar.tsx`, `components/ui/tooltip.tsx`, `hooks/use-mobile.ts`,
  `app/[locale]/dashboard/app-sidebar.tsx` (+ test).
- Changed: `app/[locale]/dashboard/layout.tsx` (sidebar shell replaces the header),
  `user-menu.tsx` (trigger restyled for the sidebar footer row, same menu contents),
  `app/[locale]/dashboard/settings/layout.tsx` (drops the now-redundant tab strip),
  `messages/en.json` (one new key for the sidebar's toggle button label; two keys that only
  the removed header/tab-strip used are dropped).
- Removed: `dashboard-nav.tsx`, `mobile-nav.tsx`, `nav-links.ts` (folded into
  `app-sidebar.tsx` — one component now, not two that had to be kept in sync),
  `settings/settings-nav.tsx` (superseded by the sidebar's own Settings sub-links).
- No schema change, no new external dependency (`@radix-ui/react-tooltip` used by the new
  Tooltip primitive is already installed for a different, unused-until-now purpose), no
  auth/billing/RLS surface touched — pure navigation/presentation restructuring.
