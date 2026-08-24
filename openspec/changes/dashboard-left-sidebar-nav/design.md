## Context

See `proposal.md` for the motivation (a reference screenshot the person shared) and the exact
mapping decision (apply the _layout pattern_ to this template's real nav, not the reference's
example content). This document covers the technical choices behind that mapping and behind
the new `components/ui/sidebar.tsx` primitive.

`app/[locale]/globals.css` already defines a full `--sidebar*` CSS variable set (`--sidebar`,
`--sidebar-foreground`, `--sidebar-primary`, `--sidebar-accent`, `--sidebar-border`,
`--sidebar-ring`, for both light and dark) even though no component used them yet — this is
the exact token set shadcn/ui's own `Sidebar` block expects, in both themes, so the visual
design was already anticipated here; this change is the first thing that consumes those
tokens.

## Goals / Non-Goals

**Goals:**

- One component drives both desktop and mobile presentation, so they cannot drift apart the
  way two hand-maintained components (the old `dashboard-nav.tsx` / `mobile-nav.tsx`) could.
- The sidebar is a real, reusable design-system primitive (`components/ui/sidebar.tsx`), not a
  one-off — this template's whole premise is that future features build on solid foundations,
  and "add a nav item" is one of the most common things a future feature will need to do.
- Preserve every existing accessibility property from the `dashboard-shell` capability: a
  working skip-link, `aria-current="page"` on the active link, a labeled navigation landmark,
  and the dashboard chrome staying mounted around the error/not-found/loading states.
- Preserve the exact sign-out contract the golden-path E2E test depends on: a button whose
  accessible name matches "Account menu" opens a menu containing a "Sign out" item.

**Non-Goals:**

- Not replicating the reference screenshot's specific content (Pipelines, Resources, resource
  status dots, notification-count badges) — none of that data exists in this app; inventing it
  would put fake information in front of the person's real users. See proposal.md.
- Not building a general breadcrumb system. The reference shows a two-level breadcrumb
  ("Dashboard > Overview"); this app's pages already render their own `<h1>` title, so a
  second, parallel "current location" label in the content header would just repeat that
  title. The new content-area header exists only to hold the sidebar's collapse/expand
  control.
- Not adding `@radix-ui/react-collapsible` as a new dependency for the Settings group's
  expand/collapse. It's one boolean per group with no need for exit-animation choreography —
  plain `useState` plus a conditional render is simpler and this template already has enough
  UI dependencies to track.

## Decisions

**Settings becomes an expandable group instead of a flat link.** Today "Settings" is a single
link (to `/dashboard/settings/security`) and the two sub-pages show their own tab strip
(`settings-nav.tsx`) once you're there. The reference's own pattern (a top-level item that
expands to reveal its sub-pages, e.g. "Pipelines" → "Build Runs"/"Deployments"/"Release
Gates") maps directly onto "Settings" → "Security"/"Billing" — and doing that removes a
duplication that would otherwise exist (the same two links, once in the sidebar and again in
the tab strip). The group auto-expands when the current page is one of its children, matching
the existing "Settings stays highlighted across its sub-pages" behavior, just expressed as an
expanded group with the matching sub-link marked current instead of a single link marked
current. The Settings entry itself is a toggle button, not a link — it has no page of its own
now that both of its real destinations are one level down.

**`SidebarProvider` only supports the uncontrolled form (`defaultOpen`).** The canonical
shadcn/ui implementation also accepts a controlled `open`/`onOpenChange` pair for a parent
component to drive the sidebar's state externally. Nothing in this app needs that — trimming
it keeps the primitive's contract smaller without losing anything currently used.

**Collapsed state persists via a plain cookie (`sidebar_state`), read server-side.**
`app/[locale]/dashboard/layout.tsx` already reads cookies for auth; this follows the same
`await cookies()` pattern (Next.js 16 cookies are async-only) to pass `defaultOpen` into
`SidebarProvider` on first render, so a returning user doesn't see the sidebar flash from
expanded to collapsed (or vice versa) after the page loads. The client sets the same cookie
(non-`httpOnly`, first-party, no user data in it — just `"true"`/`"false"`) whenever the user
toggles the sidebar.

**`UserMenu`'s trigger now depends on `SidebarProvider` context** (it renders as a
`SidebarMenuButton`, which reads sidebar collapse state to shrink to just the avatar in
icon-only mode). This is a real, intentional new coupling — `user-menu.test.tsx` wraps its
render in `SidebarProvider` accordingly. The menu's contents, translation keys, and
accessible name (`aria-label` from `Dashboard.nav.accountMenu`) are unchanged, which is what
the golden-path E2E test and the existing unit test actually depend on.

**No new capability, one modified capability.** Everything here is a presentation change to
the same `dashboard-shell` capability introduced by `dashboard-shell-ux` — see proposal.md's
Capabilities section for how the delta is written given that change was never archived.

## Risks / Trade-offs

- **Removing the Settings tab strip changes a URL-independent affordance** (previously,
  landing on `/dashboard/settings/security` directly still showed a Billing tab to switch to,
  even with the sidebar collapsed to icons on a narrow desktop window). Mitigation: the
  sidebar's collapsed **icon** state still shows a tooltip with the group label on hover/focus,
  and expanding it back is one click; this matches how the reference's own product handles the
  same tradeoff (no secondary tab strip duplicating a sidebar group's sub-items).
- **New context dependency for `UserMenu`** (see Decisions above) — a future edit that renders
  `UserMenu` outside a `SidebarProvider` will throw instead of silently misbehaving. Treated as
  acceptable: the error is immediate and clear (`useSidebar must be used within a
SidebarProvider`), not a silent bug.
- **`openspec/specs/dashboard-shell/` doesn't exist yet** (see proposal.md note) — this delta
  is written against the last unarchived version of that requirement rather than an archived
  living spec. If `dashboard-shell-ux` is archived first, its text should match what this
  delta assumes; if it's archived after, the archive step folds both in sequence.
