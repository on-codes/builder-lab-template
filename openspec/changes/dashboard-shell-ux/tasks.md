## 1. Navigation

- [x] 1.1 `app/[locale]/dashboard/nav-links.ts` — shared link config + active-state logic
- [x] 1.2 `app/[locale]/dashboard/dashboard-nav.tsx` — desktop inline nav
- [x] 1.3 `components/ui/sheet.tsx` — hand-authored on `@radix-ui/react-dialog` (already a
      dependency), no new package
- [x] 1.4 `app/[locale]/dashboard/mobile-nav.tsx` — hamburger + Sheet, same links as 1.2
- [x] 1.5 `app/[locale]/dashboard/layout.tsx` — wires both in, adds the skip-to-content link
      and `<main id="main-content">` landmark, keeps the one shared content container
- [x] 1.6 `user-menu.tsx` — drop the now-redundant Settings dropdown item

## 2. Error handling

- [x] 2.1 `app/[locale]/error.tsx` — locale-wide boundary, translated copy, retry + home
- [x] 2.2 `app/[locale]/dashboard/error.tsx` — dashboard-scoped, nav stays visible, retry +
      dashboard link
- [x] 2.3 `app/global-error.tsx` — no `app/layout.tsx` above `app/[locale]/layout.tsx` in this
      project, so `[locale]` is the true root segment and this lives at the true filesystem
      root per Next's own convention; plain English, no next-intl/Tailwind/shadcn

## 3. Not-found handling

- [x] 3.1 `app/[locale]/not-found.tsx` — locale-wide, translated
- [x] 3.2 `app/[locale]/dashboard/not-found.tsx` — dashboard-scoped, nav stays visible
- [x] 3.3 `app/not-found.tsx` — true root fallback, plain English (outside the locale tree)

## 4. Loading state

- [x] 4.1 `app/[locale]/dashboard/loading.tsx` — skeleton fallback for the dashboard segment

## 5. Responsive verification

- [x] 5.1 Real screenshots (375/768/1280px) of every marketing + auth page — 24/24 clean, no
      fixes needed
- [x] 5.2 Code-level + live-rendered review of the two settings screens (bypassing auth with
      mock props on a throwaway route, since this environment has no real Supabase project to
      log in with; the route was deleted before finishing) — found and fixed a real overflow
      risk in the security screen's session list (see 5.2.1)
- [x] 5.2.1 `security-settings-form.tsx` — `SessionRow` stacks on mobile; the raw
      `navigator.userAgent` string (not a friendly device name) now wraps correctly instead of
      colliding with the revoke button
- [x] 5.3 `settings-nav.tsx` gets horizontal-scroll overflow handling as a safety net
- [x] 5.4 Dashboard shell itself reviewed at narrow widths; one real edge case found (a long
      product name in the header could wrap to two lines) and fixed with `min-w-0 truncate` on
      the app-name link

## 6. Tests

- [x] 6.1 `dashboard-nav.test.tsx` — active-link logic for both nav items
- [x] 6.2 `mobile-nav.test.tsx` — opens, shows both links, closes on navigation
- [x] 6.3 `user-menu.test.tsx` updated for the dropdown's reduced content
- [x] 6.4 `error.test.tsx` / `not-found.test.tsx` at all three levels (locale, dashboard, true
      root) — friendly message shown, raw error never shown, retry/reset wired, correct link
      targets; the two root-level ones (`global-error.tsx`, root `not-found.tsx`) render via
      `renderToStaticMarkup` rather than RTL's DOM-mounting `render()`, since their root element
      is `<html>/<body>` itself
- [x] 6.5 `e2e/marketing.spec.ts` — live-browser check that an unmatched route returns a real
      404 status and shows the friendly page, not a framework default

## 7. Verification

- [x] 7.1 `pnpm exec oxlint .`, `pnpm exec oxfmt --check .`, `pnpm typecheck`, `pnpm test`
      (84/84) all pass on the combined result
- [x] 7.2 A full `next build` succeeds (16 routes, all compiling)
- [x] 7.3 Every scenario in `specs/dashboard-shell/spec.md` checked against the finished code
      (see that file — all ADDED requirements verified against the implementation above)

### Known, deliberately out-of-scope observations (not fixed here)

Flagged during the responsive pass, judged as separate design-system-level decisions rather
than page-level bugs — noted for a future change, not silently dropped:

- shadcn's default `Button` height (`size-9`/`h-9`, 36px) is a few px under the ~40px touch
  target guideline. It's used consistently everywhere in the app, so raising it is a global
  design-system change, not something to special-case on the pages touched here.
