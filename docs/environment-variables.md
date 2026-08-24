# Environment variables

Every value this app needs to connect to Supabase, Stripe, and Resend — and a couple it
generates for itself — is read from **environment variables**: settings that live outside the
code, in a file named `.env.local` in the project root (the same folder as `package.json`),
never committed to GitHub.

Normally a boilerplate ships a `.env.example` file listing every variable with a blank/sample
value, ready to copy to `.env.local`. This repo's own permission rules stop Claude from
creating, reading, or editing **any** file starting with `.env` — including `.env.example`
itself, even though it holds no real secrets — as an extra safety rail around anything that
touches real keys. That rule needs a person to change it, so it stays in place for now. This
document is the substitute: it lists exactly the same information a `.env.example` file would,
and a person (not Claude) creates `.env.local` and pastes each value in by hand.

**How to use this file**: create a new file named `.env.local` in the project root. Add one
line per variable below, in the form `NAME=value` (no spaces around the `=`; wrap the value in
quotes only if it contains spaces, like `EMAIL_FROM_ADDRESS` below). Claude Code can tell you
exactly where to click to find each real value — that's what the "Where to get it" line under
each variable is for.

## At a glance

| Variable                             | Where it's from                        | Placeholder-safe for now?                                        |
| ------------------------------------ | -------------------------------------- | ---------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`           | Supabase dashboard                     | No — always the real value                                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`      | Supabase dashboard                     | No — always the real value                                       |
| `SUPABASE_SERVICE_ROLE_KEY`          | Supabase dashboard                     | No — always the real value                                       |
| `NEXT_PUBLIC_SITE_URL`               | Your own app's address                 | No — always the real, current address                            |
| `OTP_HASH_SECRET`                    | Generated once (Claude does this)      | No — always a real secret, but never Stripe- or Supabase-sourced |
| `RESEND_API_KEY`                     | Resend dashboard                       | Only if you're not testing email flows yet                       |
| `EMAIL_FROM_ADDRESS`                 | Your choice + a verified Resend domain | Yes — has a working default                                      |
| `STRIPE_SECRET_KEY`                  | Stripe dashboard                       | Yes — use the test-mode (`sk_test_...`) key                      |
| `STRIPE_WEBHOOK_SECRET`              | Stripe dashboard or Stripe CLI         | Yes — a test-mode value is correct                               |
| `STRIPE_PRICE_ID_PRO`                | Stripe dashboard                       | Yes — use a test-mode price ID                                   |
| `STRIPE_PRICE_ID_BUSINESS`           | Stripe dashboard                       | Yes — use a test-mode price ID                                   |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe dashboard                       | Yes — use the test-mode (`pk_test_...`) key                      |

"Placeholder-safe" never means "type in random text" — the app makes real calls to Supabase,
Stripe, and Resend the moment you run `pnpm dev`, so every value below has to be a real value
from a real (free) account. For Stripe, "placeholder-safe" specifically means: use the free
**test-mode** credentials from your Stripe account (never fake text) — see the Stripe section
below for what that means. Supabase has no separate test mode at all, so those three values
must always be the one real project's real values.

## Supabase

Supabase is this app's database, user accounts, and file storage, all in one. Every project on
this template needs its own Supabase project — free tier is enough to build and demo. Once you
have one, all three values below come from the same screen: **Supabase dashboard → your project
→ Project Settings (gear icon) → API**.

### `NEXT_PUBLIC_SUPABASE_URL`

Your project's unique address, shown as "Project URL" — looks like
`https://abcdefghijk.supabase.co`. Safe to be visible in browser code (the `NEXT_PUBLIC_` prefix
means Next.js bundles it into the code that ships to the browser) — it's just an address, not a
secret.

### `NEXT_PUBLIC_SUPABASE_ANON_KEY`

The "Project API keys" section, the `anon` / `public` key (some newer Supabase dashboards call
this the "publishable key" instead — same value, same place). Also safe to be visible in
browser code by design: this key alone can't read or change data it isn't allowed to — that
protection comes from Row Level Security (RLS) policies on each table, not from keeping this
key secret.

### `SUPABASE_SERVICE_ROLE_KEY`

Same "Project API keys" section, the `service_role` / `secret` key. This one is the opposite of
the key above: it bypasses Row Level Security entirely, so it can read and write anything in the
database no matter who's asking. It must **never** appear in any code that runs in a browser —
this app only ever uses it in code that runs on the server (Server Actions, Route Handlers).
Treat it like a master password.

## Your app's own address

### `NEXT_PUBLIC_SITE_URL`

Not from any dashboard — this is the address of the app itself, used to build links in emails
(password reset, verification) and Stripe checkout redirect URLs. Locally, this is
`http://localhost:3000`. Once deployed, it's the real deployed address (your Vercel URL, or a
custom domain once one is connected) — Claude sets the correct value for each environment
(local `.env.local` vs. the deployed project's Vercel environment variables) rather than this
being a one-time, set-and-forget value.

## Login security

### `OTP_HASH_SECRET`

Not from any dashboard — a private random string this app generates for itself, used to
scramble ("hash") the 6-digit email login codes before they're stored, so that even someone
who somehow got raw access to the database couldn't read anyone's active code. Claude generates
a long random value for this once (there's nothing for a person to look up or copy from
anywhere) — it just needs to stay the same over time, since a code issued a few minutes ago
still needs to be checkable against it.

## Email — Resend

Resend is the service that actually delivers the app's emails (signup verification, MFA codes,
password reset, payment receipts/failures). Unlike Stripe, Resend doesn't have a separate "test
mode" — there's just one kind of key — so `RESEND_API_KEY` needs to be a real key before any
email-sending flow will actually work, even in development.

### `RESEND_API_KEY`

**Resend dashboard → API Keys → Create API Key.** Required for any screen that sends an email.
Fine to leave unset while you're only building/testing screens that don't send email yet — that
specific action will simply fail with a clear error once it's actually exercised, rather than
breaking anything else.

### `EMAIL_FROM_ADDRESS`

Optional — the "from" name and address your emails appear to come from, e.g.
`"BuilderLab <notifications@yourdomain.com>"` (quotes needed here because of the space). If
left unset, a placeholder default is used, which is fine for early local testing but won't
reliably deliver once real users are involved. The domain half of whatever address you choose
needs to be added and verified under **Resend dashboard → Domains** before Resend will actually
send mail "from" it.

## Payments — Stripe

Stripe has a genuine **test mode**: a completely separate sandbox with its own keys, its own
fake "test card" numbers, and its own product/price catalog, that behaves identically to real
Stripe without ever touching real money. This template defaults to test mode everywhere and
stays there until a person explicitly says, out loud, that they're ready to charge real
customers (`.claude/CLAUDE.md` section 8) — Claude never flips this switch on its own.

All four Stripe values below come from **Stripe dashboard → Developers → API keys** (for the
two keys) or **Stripe dashboard → Product catalog** (for the two price IDs). Every one of them
has a test-mode version and a live-mode version that look different and are never
interchangeable — always use the test-mode version for now.

### `STRIPE_SECRET_KEY`

**Developers → API keys → "Secret key."** Starts `sk_test_...` in test mode (what you want for
now) or `sk_live_...` once actually charging customers. Server-only — never exposed to the
browser.

### `STRIPE_WEBHOOK_SECRET`

A "webhook" is how Stripe tells this app the moment something happens on its side — a payment
succeeded, a subscription was canceled — by calling this app's own
`/api/webhooks/stripe` address. This value is how the app proves an incoming call genuinely
came from Stripe and not an impostor.

- **For local development**: install the [Stripe CLI](https://stripe.com/docs/stripe-cli), run
  `stripe listen --forward-to localhost:3000/api/webhooks/stripe`, and use the `whsec_...` value
  it prints. It's a fresh test-mode secret every time that command runs.
- **For a deployed project**: **Stripe dashboard → Developers → Webhooks → Add endpoint**,
  pointing at `https://<your-deployed-domain>/api/webhooks/stripe`, then copy that specific
  endpoint's "Signing secret." This can still be a test-mode endpoint until going live.

### `STRIPE_PRICE_ID_PRO`

**Product catalog → the "Pro" product → its price → copy the Price ID** (starts `price_...`).
Use the test-mode product/price for now. Renaming or repricing the "Pro" tier for a new project
means updating the product/price in Stripe and this value together — never hardcoding a price
anywhere in code.

### `STRIPE_PRICE_ID_BUSINESS`

Same as above, for the "Business" product.

### `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

**Developers → API keys → "Publishable key"** (starts `pk_test_...` in test mode). This is the
one Stripe value that's safe to expose in browser code by design — it can only ever start a
checkout, never move money on its own. Today's checkout flow redirects to a Stripe-hosted page
and doesn't read this value from any screen yet, but it's included here (and already set up for
automated tests) so it's ready the moment a future screen needs Stripe.js directly in the
browser.

## One variable you never set yourself

`NODE_ENV` is read in one place (`lib/auth/cookies.ts`, to decide whether session cookies
require HTTPS) but is set automatically — by `next dev` locally (`development`) and by Vercel
during a deployed build (`production`). Don't add it to `.env.local`; setting it by hand can
cause confusing, hard-to-diagnose behavior.
