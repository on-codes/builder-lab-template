# Architecture reference

A map of how this template's built-in foundation (routing, auth, MFA, billing, i18n, testing,
spec workflow) fits together — for whoever (human or Claude Code) is building a new project on
top of it. Unlike `.claude/CLAUDE.md`, which sets rules for how Claude must behave in this repo,
this document just explains how the existing code works and where to look. It links to source
files instead of duplicating them — those files are the source of truth; if this doc and the
code ever disagree, the code wins and this doc is stale.

Audience is technical (a future Claude Code session, or a developer). For the plain-English
version of any of this, see `.claude/CLAUDE.md` and the relevant `.claude/skills/*/SKILL.md`.

## Route structure

Every route lives under `app/[locale]/...` — the `[locale]` dynamic segment is next-intl's,
present from the very first auth screens rather than retrofitted later (see
`openspec/changes/add-auth-foundation/design.md`, "Decisions"). With only one locale
(`en`) configured and `localePrefix: "as-needed"` (`i18n/routing.ts`), the default locale gets
no visible prefix — `/dashboard`, not `/en/dashboard` — so day-to-day this is invisible; it
matters the moment a second locale is added.

Below `[locale]`, three groupings:

- **`(marketing)`** — a route group (parens = doesn't appear in the URL) holding the public
  site. `app/[locale]/(marketing)/page.tsx` is the home page (resolves to `/`), sharing
  `app/[locale]/(marketing)/layout.tsx`'s header (nav linking to `/pricing`, `/about`) and
  footer (linking to `/terms`, `/privacy`) — a plain Server Component shell, no client-side
  interactivity needed.
- **`(auth)`** — a route group holding `/login`, `/signup`, `/forgot-password`,
  `/reset-password`, `/verify-mfa`, all sharing the centered-card layout in
  `app/[locale]/(auth)/layout.tsx`.
- **`dashboard/`** — a **real** folder, not a route group, so it's an actual `/dashboard` URL
  segment. Holds `/dashboard` and `/dashboard/settings/{billing,security}` today. Gated by
  `requireUser()` directly inside `app/[locale]/dashboard/layout.tsx`, in addition to `proxy.ts`
  (see "Two-layer session model" below for why both checks exist).

**Why `dashboard` can't also be a paren route group, the way `(marketing)` is.** Route-group
folder names are stripped from the URL, so `app/[locale]/(marketing)/page.tsx` resolves to
`/[locale]` — i.e. `/`. If the dashboard were `app/[locale]/(dashboard)/page.tsx` instead of a
real `dashboard/` folder, it would resolve to that exact same `/`, and Next.js can't have two
different `page.tsx` files both claiming the same route. Two route groups can share a layout
strategy, but they can never both own `/` — one of them has to be a real segment with its own
path prefix instead, which is why the dashboard home is `/dashboard`, not `/`. `proxy.ts`
states this same reasoning in its own top-of-file comment.

`proxy.ts` (not `middleware.ts` — see `.claude/CLAUDE.md` 1.1) does two unrelated jobs on every
request, in order: (1) runs next-intl's own routing middleware for locale resolution, then
(2) refreshes the underlying Supabase session and applies this app's own optimistic
auth-redirects (dashboard routes need `bl_session`; `/verify-mfa` needs `bl_mfa_pending`;
already-authed users get bounced out of `(auth)` routes back to `/dashboard`). That second job
is deliberately **not authoritative** — see below.

## The two-layer session model

Full design rationale: `openspec/changes/add-auth-foundation/design.md` ("Decisions" —
"Session revocation is app-level..."). Implementation: `lib/auth/session.ts`,
`lib/auth/cookies.ts`.

There are two independent sessions layered on top of each other:

1. **Supabase's own session** — the standard `@supabase/ssr` JWT + refresh-token cookies.
   Established as soon as `signInWithPassword` succeeds, refreshed by `proxy.ts` calling
   `supabase.auth.getUser()` on every request. This exists **even mid-MFA-challenge** — see the
   accepted risk below.
2. **This app's own session** — a `user_sessions` row per login (`user_agent`, `created_at`,
   `last_seen_at`, `revoked_at`) plus an httpOnly `bl_session` cookie (`lib/auth/cookies.ts`)
   whose value is that row's id. This is this app's own "fully authenticated" signal, entirely
   separate from whether the Supabase JWT is still valid.

Why two layers instead of just relying on Supabase: revocation needs to be instant and not
depend on guessing which Supabase Admin API surface for "sign out this one other session" a
given `supabase-js` version exposes. Checking a row this template owns end-to-end is a
guarantee that doesn't shift under a dependency upgrade.

**`requireUser()`** (`lib/auth/session.ts`) is the authoritative check every Server Action and
Route Handler must call itself — `proxy.ts` never runs in front of Server Actions (`.claude/CLAUDE.md`
1.1), so its redirects are a fast, optimistic UX nicety only. `requireUser()` requires **all**
of: a `bl_session` cookie present → a valid Supabase user → a non-revoked `user_sessions` row
matching both the cookie's id and that user → a `profiles` row. It returns
`{ id, email, role, sessionId }` and best-effort touches `last_seen_at`. `requireRole(role)`
wraps it with a role check, always re-loaded from the database, never from a client-supplied
value or cached claim.

Session lifecycle functions, all in `lib/auth/session.ts`: `createSession(userId)` (called only
once login is **fully** complete — no MFA, or MFA just passed — never mid-challenge),
`endCurrentSession()` (sign-out), `listActiveSessions()` / `revokeSession(id)` (the Settings →
Security screen, `app/[locale]/dashboard/settings/security/`).

**Accepted risk** (see design.md's "Risks/Trade-offs"): because Supabase's own cookie exists
before MFA completes, a client that queries Supabase directly (bypassing this app's Server
Actions) could read whatever RLS allows that user during the ~10-minute pending window. Accepted
for v1 because it only exposes what RLS already lets a browser client read directly — which, by
this template's own convention, should be low-sensitivity — and every Server Action (the
intended path for anything sensitive) enforces the full `bl_session` gate regardless.

## MFA flow (email OTP, not TOTP)

Source: `lib/auth/otp.ts`, `lib/actions/auth/{log-in,verify-mfa,mfa-toggle}.ts`,
`supabase/migrations/20260823221801_mfa_otp_codes.sql`, design rationale in
`openspec/changes/add-auth-foundation/design.md` ("MFA codes are single-use, hashed, expiring
rows"). This is a 6-digit emailed code, not an authenticator app — Supabase Auth's own MFA
factor APIs are shaped for TOTP/phone, so this template implements its own second factor rather
than forcing email OTP through an API built for a different factor type.

- `mfa_otp_codes(user_id, code_hash, expires_at, attempts, max_attempts, created_at)` — RLS
  `using (false)`, i.e. **zero** direct client access ever; every read/write goes through a
  Server Action on the service-role client. `code_hash` is a keyed hash (`OTP_HASH_SECRET` +
  code, SHA-256), compared with `timingSafeEqual` — never a plaintext comparison.
- **Login** (`lib/actions/auth/log-in.ts`): password verified via Supabase →
  `profiles.mfa_enabled` checked → if `false`, `createSession()` runs immediately; if `true`,
  `issueOtp()` creates the row (invalidating any previous pending code for that user first),
  `setMfaPendingCookie()` stores the row's id in `bl_mfa_pending`, and the code is emailed via
  `MfaCodeEmail`.
- **Verification** (`lib/actions/auth/verify-mfa.ts`): reads `bl_mfa_pending`, rate-limited
  (15 attempts / 15 min / IP), calls `verifyOtp(otpId, code)` — throws a typed `OtpError`
  (`NOT_FOUND` / `EXPIRED` / `LOCKED` at 5 attempts / `INVALID`), never returns a boolean the
  caller could mishandle. On success the row is deleted (single-use), the pending cookie is
  cleared, and **only now** does `createSession()` run — this is the one and only path that
  turns a pending login into a fully authenticated one when MFA is on.
- **Resend** (`resendMfaCode`): 30-second cooldown via `canResendOtp()`.
- **Toggle** (`lib/actions/auth/mfa-toggle.ts`): `enableMfa()` / `disableMfa()` just flip
  `profiles.mfa_enabled` for the already-authenticated caller (Settings → Security).
- `proxy.ts` special-cases `/verify-mfa`: already fully authed → redirect to `/dashboard`; no
  `bl_mfa_pending` cookie → redirect to `/login`; otherwise allow through.

## Stripe billing flow

Source: `lib/stripe/{client,plans,subscription}.ts`, `lib/actions/billing/{checkout,portal}.ts`,
`app/api/webhooks/stripe/route.ts`, design rationale in
`openspec/changes/add-stripe-billing/design.md`.

**Checkout → webhook → `subscriptions` → gate**, end to end:

1. **Plan config** (`lib/stripe/plans.ts`): `PLANS` maps a plan id (`"pro"` / `"business"`) to a
   Stripe Price ID read from an env var (`STRIPE_PRICE_ID_PRO` / `STRIPE_PRICE_ID_BUSINESS`),
   never a hardcoded string — Price IDs differ between test and live Stripe modes. Adding a
   third plan is a new env var + one new object entry, never a Checkout/webhook code change.
2. **Checkout** (`createCheckoutSession`, `lib/actions/billing/checkout.ts`): `requireUser()` →
   resolves the real Price ID server-side from the plan id the client sent (never a
   client-supplied price/amount) → reuses the user's existing `stripe_customer_id` from
   `subscriptions` if one already exists (so resubscribing doesn't create a second Stripe
   customer) → creates a Checkout Session with `client_reference_id`/`metadata` carrying the
   user id → returns `session.url` for the client to redirect to.
3. **Webhook** (`app/api/webhooks/stripe/route.ts`, a Route Handler, not a Server Action — it
   still enforces signature verification per `.claude/GUARDRAILS.md`): reads the **raw**
   `request.text()` (never `.json()`, which would re-serialize and break signature
   verification) and calls `stripe.webhooks.constructEvent(rawBody, signature,
STRIPE_WEBHOOK_SECRET)`. Idempotency is an **insert-first** into
   `processed_stripe_events(event_id primary key)` — a unique-constraint conflict (Postgres code
   `23505`) means "already handled, return 200, do nothing"; this closes the race window a
   select-then-insert check would leave open between two concurrent deliveries of the same
   retried event. Handles: `checkout.session.completed` (fetches the full Subscription object
   and does the first full sync), `customer.subscription.updated` / `.deleted` (looked up back
   to a user via the unique `stripe_customer_id` index, since those events only carry a Stripe
   customer id), `invoice.payment_succeeded` / `.payment_failed` (send the receipt /
   payment-failed email via `sendEmail`).
4. **`subscriptions` table** (one row per user, `user_id` primary key, unique
   `stripe_customer_id` / `stripe_subscription_id`): the webhook handler is the **only** writer;
   RLS only grants `select` on your own row. A client-supplied "I'm subscribed" value is never
   trusted anywhere.
5. **The gate** (`lib/stripe/subscription.ts`): `requireActiveSubscription()` re-derives status
   from `subscriptions` on **every call** (`status in {active, trialing}`) — never cached across
   requests — and throws `SubscriptionRequiredError` rather than returning a boolean, so a
   caller can't accidentally ignore it. `hasActiveSubscription()` is the non-throwing variant for
   UI branches (e.g. "show an upgrade prompt").

The Customer Portal (`createPortalSession`, `lib/actions/billing/portal.ts`) is the same
shape as checkout — `requireUser()`, look up `stripe_customer_id`, create a portal session,
return its `url` — and handles plan changes/cancellation/proration entirely on Stripe's side;
this template never hand-builds that UI.

## i18n structure

Source: `i18n/{routing,navigation,request}.ts`, `messages/en.json`,
`lib/i18n/email-translator.ts`. Day-to-day authoring conventions:
`.claude/skills/i18n/SKILL.md` (not repeated here).

- **`i18n/routing.ts`** — `defineRouting({ locales, defaultLocale, localePrefix })`. Adding a
  locale later is one array entry here, nothing structural.
- **`i18n/navigation.ts`** — `createNavigation(routing)`'s locale-aware `Link` / `redirect` /
  `usePathname` / `useRouter` / `getPathname`, always imported instead of `next/link` /
  `next/navigation` so links stay correct once a non-default locale has a URL prefix.
- **`i18n/request.ts`** — `getRequestConfig`, resolves the active locale and dynamically
  imports `messages/<locale>.json` for next-intl's request-scoped machinery.
- **`messages/en.json`** — the one message catalog file today. A second locale is a sibling
  file (`messages/es.json`, etc.) plus a `routing.ts` entry — never a code change at call
  sites, which is the entire point of wiring this in from the start (see
  `openspec/changes/add-auth-foundation/design.md`'s route-structure decision).
- Pages/components use `next-intl`'s `useTranslations` (Client Components) or
  `getTranslations` (Server Components/Actions) — both read the catalog through Next's own
  request-scoped context.

**Emails translate differently, on purpose** — `lib/i18n/email-translator.ts`'s own comment
explains why: email templates render outside the Next.js request lifecycle, in three different
bundlers (the real server at send time, Vitest in tests, and the `react-email` CLI's bundler
for `pnpm email:dev`), none of which reliably set the `"react-server"` package export condition
that `next-intl/server`'s `getTranslations` depends on. `getEmailTranslator(locale, namespace)`
uses `use-intl`'s `createTranslator` directly instead — the same engine next-intl uses
internally, minus the Next.js-specific wiring — so it behaves identically in all three. That
file also deliberately omits `import "server-only"` (unlike almost everything else under
`lib/`): it needs to import cleanly under Vitest's jsdom environment and the react-email CLI,
neither of which resolves package export conditions the way `server-only`'s client-detection
expects, and since the module reads no secret and touches no server-only API, the guard has
nothing to protect there anyway.

## Testing strategy

Day-to-day authoring conventions: `.claude/skills/testing/SKILL.md` (not repeated here).

- **Vitest** (`vitest.config.mts`) runs in the **`node`** environment by default — most tests
  here are Server Actions and plain `lib/` logic, not component rendering. A test that
  genuinely needs a DOM opts in per-file with a `// @vitest-environment jsdom` pragma comment.
- **`vitest.setup.ts`** does two things every test relies on: (1) mocks the `server-only`
  package to a no-op, since Vitest never sets the `"react-server"` condition and every
  `import "server-only"` file would otherwise throw the instant a test touches it; (2)
  pre-stubs every real environment variable this app reads with a dummy, test-mode-safe value
  (using `||=`, so a real `.env.local` value is never clobbered if one happens to be present).
  This file is the authoritative list `docs/environment-variables.md` is generated from.
- **`test/mocks/next-headers.ts`** mocks `next/headers`'s `cookies()` / `headers()` — which
  only work inside Next's own request-scoped async context and throw under plain Vitest — with
  an in-memory, `Map`-backed store (`mockCookieStore`, `mockHeaderStore`) plus a
  `resetMockRequest()` helper to call in `beforeEach`. Any test exercising a Server Action that
  touches cookies (`lib/auth/cookies.ts`) or reads the client IP (`lib/actions/client-ip.ts`)
  needs this mock.
- **Coverage**: v8 provider, target 70%+ on `lib/**` and `app/api/**` — measured and reported
  in CI, not a hard gate here, since a downstream project's coverage shifts as features get
  added on top of this boilerplate.
- **Playwright (E2E)** (`playwright.config.ts`, `e2e/`) runs against `next dev` on a dedicated
  port (3100), started automatically by Playwright's own `webServer` config — `pnpm test:e2e`.
  Two kinds of spec, by design:
  - **`e2e/marketing.spec.ts`** — smoke tests only: a heading renders, a form field is
    reachable by its accessible label, `proxy.ts`'s redirects fire correctly
    (`/dashboard` → `/login` while logged out, etc.). No real Supabase/Stripe project needed —
    safe to run anywhere, including with the same dummy credentials `vitest.setup.ts` uses.
  - **`e2e/golden-path.spec.ts`** — the real signup → verify → log in → subscribe → manage
    flow, against a real Supabase project and real Stripe test-mode credentials (see
    `docs/environment-variables.md`). Each suite calls `test.skip(...)` up front, driven by
    `e2e/helpers/supabase-admin.ts`'s `hasRealSupabaseCredentials()` /
    `hasRealStripeTestCredentials()`, so it degrades to "skipped" rather than "failed" when
    run without real credentials configured. Email verification goes through the Supabase
    Admin API (equivalent to what happens server-side when a real link is clicked) rather than
    reading a real inbox; the MFA email code deliberately can **not** be substituted the same
    way, since `lib/auth/otp.ts` stores only a keyed hash of it, never the plaintext — this
    suite proves the app reaches the `/verify-mfa` challenge screen correctly and stops there.

## OpenSpec workflow

Full workflow rules: `.claude/CLAUDE.md` section 14 (not repeated here). Structurally,
`openspec/` holds three directories: `specs/` (the living, merged source of truth),
`changes/` (in-flight proposals — each a folder with `proposal.md`, an optional `design.md` for
anything touching auth/billing/RLS, and a delta `specs/`), and `changes/archive/` (completed
changes, moved there once their delta has been merged into `specs/`). The two `design.md` files
cited throughout this document (`openspec/changes/add-auth-foundation/design.md` and
`openspec/changes/add-stripe-billing/design.md`) are themselves still in-flight change folders
at this point — they're the primary design record for the auth and billing foundations until
archived.
