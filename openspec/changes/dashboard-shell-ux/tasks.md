## 1. Navigation

- [ ] 1.1 `app/[locale]/dashboard/nav-links.ts` — shared link config + active-state logic
- [ ] 1.2 `app/[locale]/dashboard/dashboard-nav.tsx` — desktop inline nav
- [ ] 1.3 `components/ui/sheet.tsx` — hand-authored on `@radix-ui/react-dialog` (already a
      dependency), no new package
- [ ] 1.4 `app/[locale]/dashboard/mobile-nav.tsx` — hamburger + Sheet, same links as 1.2
- [ ] 1.5 `app/[locale]/dashboard/layout.tsx` — wires both in, adds the skip-to-content link
      and `<main id="main-content">` landmark, keeps the one shared content container
- [ ] 1.6 `user-menu.tsx` — drop the now-redundant Settings dropdown item

## 2. Error handling

- [ ] 2.1 `app/[locale]/error.tsx` — locale-wide boundary, translated copy, retry + home
- [ ] 2.2 `app/[locale]/dashboard/error.tsx` — dashboard-scoped, nav stays visible, retry +
      dashboard link
- [ ] 2.3 `global-error.tsx` at whichever level Next's root-layout-error convention requires —
      plain English (no next-intl available at this level), minimal/dependency-light

## 3. Not-found handling

- [ ] 3.1 `app/[locale]/not-found.tsx` — locale-wide, translated
- [ ] 3.2 `app/[locale]/dashboard/not-found.tsx` — dashboard-scoped, nav stays visible
- [ ] 3.3 `app/not-found.tsx` — true root fallback, plain English (outside the locale tree)

## 4. Loading state

- [ ] 4.1 `app/[locale]/dashboard/loading.tsx` — skeleton fallback for the dashboard segment

## 5. Responsive verification

- [ ] 5.1 Real screenshots (375/768/1280px) of every marketing + auth page, issues fixed
- [ ] 5.2 Code-level review of the two settings screens (can't be screenshotted without a real
      login) against a 375px viewport, issues fixed
- [ ] 5.3 `settings-nav.tsx` gets horizontal-scroll overflow handling as a safety net
- [ ] 5.4 Dashboard shell itself (navbar at narrow widths) reviewed/verified

## 6. Tests

- [ ] 6.1 `dashboard-nav.test.tsx` — active-link logic for both nav items
- [ ] 6.2 `mobile-nav.test.tsx` — opens, shows both links, closes on navigation
- [ ] 6.3 `user-menu.test.tsx` updated for the dropdown's reduced content

## 7. Verification

- [ ] 7.1 `pnpm exec oxlint .`, `pnpm exec oxfmt --check .`, `pnpm typecheck`, `pnpm test` all
      pass on the combined result
- [ ] 7.2 A full `next build` succeeds
- [ ] 7.3 Every scenario in `specs/dashboard-shell/spec.md` checked against the finished code
