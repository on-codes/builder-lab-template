## 1. Shared primitives

- [x] 1.1 `hooks/use-mobile.ts` — `useIsMobile()`, matchMedia-based, SSR-safe default
- [x] 1.2 `components/ui/tooltip.tsx` — `Tooltip`/`TooltipTrigger`/`TooltipContent`/
      `TooltipProvider`, built on `@radix-ui/react-tooltip` (already a dependency, unused until
      now)
- [x] 1.3 `components/ui/sidebar.tsx` — `SidebarProvider`/`useSidebar` (uncontrolled state only,
      see design.md), `Sidebar` (desktop fixed panel + mobile `Sheet`, `collapsible="icon"`),
      `SidebarTrigger`, `SidebarRail`, `SidebarInset`, `SidebarHeader`, `SidebarFooter`,
      `SidebarContent`, `SidebarSeparator`, `SidebarGroup`/`SidebarGroupLabel`/
      `SidebarGroupContent`, `SidebarMenu`/`SidebarMenuItem`/`SidebarMenuButton` (with optional
      collapsed-state tooltip), `SidebarMenuSub`/`SidebarMenuSubItem`/`SidebarMenuSubButton`

## 2. App sidebar

- [x] 2.1 `app/[locale]/dashboard/app-sidebar.tsx` — Dashboard link + expandable Settings group
      (Security/Billing sub-links, auto-expanded when a child is active), header (app name,
      links to `/dashboard`), footer slot for the account menu; nav links wrapped in
      `<nav aria-label>` using the existing `Dashboard.nav.navLabel` string
- [x] 2.2 `user-menu.tsx` — trigger becomes a `SidebarMenuButton` (avatar + email + chevron)
      for the sidebar footer, same dropdown contents/translation keys/accessible name

## 3. Layout wiring

- [x] 3.1 `app/[locale]/dashboard/layout.tsx` — read the `sidebar_state` cookie
      (`await cookies()`) for `SidebarProvider`'s `defaultOpen`; compose
      `SidebarProvider` → `AppSidebar` + `SidebarInset` (holds the skip-link target, a slim
      header with just `SidebarTrigger`, and the existing content container); keep the
      skip-to-content link as the first element on the page
- [x] 3.2 `app/[locale]/dashboard/settings/layout.tsx` — drop `<SettingsNav />`, keep only the
      shared max-width wrapper

## 4. i18n

- [x] 4.1 `messages/en.json` — add `Dashboard.nav.toggleSidebar`; remove `Dashboard.nav.openMenu`
      and `Settings.nav.navLabel` (both only used by files this change removes)

## 5. Remove superseded files

- [x] 5.1 Delete `dashboard-nav.tsx` + `dashboard-nav.test.tsx`, `mobile-nav.tsx` +
      `mobile-nav.test.tsx`, `nav-links.ts` (folded into `app-sidebar.tsx` — one component now,
      not two to keep in sync)
- [x] 5.2 Delete `settings/settings-nav.tsx` (superseded by the sidebar's own Settings
      sub-links)

## 6. Tests

- [x] 6.1 `app-sidebar.test.tsx` — Dashboard link marked current on `/dashboard`; Settings group
      auto-expands and the matching sub-link is marked current on `/dashboard/settings/billing`;
      mobile viewport renders the trigger and opens/closes the overlay with the same links
- [x] 6.2 `user-menu.test.tsx` — updated to render inside `SidebarProvider`; same assertions
      (email shown, sign-out calls the action) still hold
- [x] 6.3 Full suite still green with the removed files' tests gone and the new ones in (85/85)

## 7. Verification

- [x] 7.1 Real screenshots (390/820/1440px, light + dark) of the dashboard, a Settings sub-page,
      and the collapsed-sidebar state via a throwaway preview route (same technique
      `dashboard-shell-ux` used — see its tasks.md 5.2 — deleted before this change was
      committed). Found and fixed two real issues this way: the collapsed footer button clipped
      the account avatar (icon-mode padding assumed a 16px nav icon, not a 32px avatar — fixed
      with a `p-0` override in `user-menu.tsx`), and the avatar's `bg-muted` fill barely
      contrasted against the sidebar's own near-white surface (added a hairline
      `ring-sidebar-border`)
- [x] 7.2 `pnpm exec oxlint .`, `pnpm exec oxfmt --check .`, `pnpm typecheck`, `pnpm test`
      (85/85) all pass on the combined result
- [x] 7.3 `next build` succeeds (14 dashboard/marketing/auth routes + the Stripe webhook route,
      all compiling)
- [x] 7.4 Every scenario in `specs/dashboard-shell/spec.md` (this change) checked against the
      finished code — see below

### 7.4 Scenario-by-scenario verification

- Desktop navigation → sidebar docked left, current link gets `aria-current="page"`: confirmed
  in screenshots and `app-sidebar.test.tsx`.
- Mobile navigation → hidden by default, trigger opens an overlay with the same links, closes
  on selection: confirmed in `app-sidebar.test.tsx`'s mobile test and the mobile screenshot.
- Settings stays highlighted across sub-pages → group auto-expands, matching sub-link gets
  `aria-current`: confirmed in `app-sidebar.test.tsx` and the settings-open screenshot.
- Sidebar collapses to icon-only, each icon still reachable/labeled → confirmed via the
  collapsed screenshots (post-fix) and `SidebarMenuButton`'s tooltip-on-collapse; keyboard
  reachability comes from `SidebarTrigger` being a real, focusable, labeled button.
- Collapsed state persists across page loads → `SidebarProvider` writes the `sidebar_state`
  cookie on toggle; `dashboard/layout.tsx` reads it server-side into `defaultOpen`. Not
  covered by an automated test (would need a real browser reload, out of scope for the unit
  test setup here) — verified by code review of the read/write pair instead.
