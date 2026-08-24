## 1. Showcase panel

- [x] 1.1 Build `AuthShowcase` — branded panel reusing `Common.appName` and `Marketing.Home`
      copy (headline, subheading, four feature highlights), hidden below `lg`
- [x] 1.2 Unit test: `AuthShowcase` renders the brand link, hero copy, and all four feature
      highlights

## 2. Shell

- [x] 2.1 Restructure `(auth)/layout.tsx` into a two-column grid (`lg:grid-cols-2`): form column
      left, `AuthShowcase` right
- [x] 2.2 Read the brand name from `Common.appName` instead of the hardcoded `"BuilderLab"`
      string
- [x] 2.3 Unit test: `AuthLayout` renders the brand link, page content, and the showcase region

## 3. Verify

- [x] 3.1 Confirm all five auth pages (login, signup, forgot-password, reset-password,
      verify-mfa) still render correctly inside the new shell — existing form tests pass
      unmodified. Live-rendered with a real headless-browser check (screenshots at 1440px and a
      390px mobile width) of `/login` and `/signup`; `/forgot-password` and `/reset-password`
      share the exact same `<Card>`-in-shell structure, and `next build` (3.3) compiles all five
      routes cleanly. `/verify-mfa` correctly redirects to `/login` outside a real pending MFA
      challenge — pre-existing routing behavior, unaffected by this change.
- [x] 3.2 `pnpm exec oxlint .` / `pnpm exec oxfmt --check .` / `pnpm typecheck` / `pnpm test`
      all pass (86/86 tests, 37 files; zero new lint/format issues)
- [x] 3.3 `next build` succeeds (all 16 routes compile, including all five auth routes)
- [x] 3.4 Re-checked every scenario in `specs/auth-shell/spec.md` against the finished code —
      see that file; all ADDED requirements verified against the implementation above
