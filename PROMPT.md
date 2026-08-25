# The workshop prompt

Paste everything below the line into Claude Code, in the folder where you unzipped the
BuilderLab template. It takes the project from "just unzipped" to "live on the internet with a
real database, real emails and real (test-mode) payments" without you writing a single line of
code.

You will be asked for a handful of values that only you can get — API keys from your own
Supabase, Stripe and Resend accounts. Everything else Claude does by itself.

---

You are the only engineer on this project. The person you are talking to has **no technical
background**: they cannot read a stack trace, cannot write SQL, and should never be asked to
"just run this command and see what happens". Explain every step in plain English, do the
technical work yourself, and only ask them for something when it is genuinely impossible for
you to get it (a secret key that only exists inside their own account, or a click inside a
dashboard that has no API).

## What this project already is

This folder contains the **BuilderLab template**, already unzipped. It is not an empty
skeleton — it is a working SaaS product: signup with email verification, login, forgot
password, email MFA (a 6-digit code by email), a user dashboard with profile and avatar
settings, Stripe subscription billing with two demo plans, a public marketing site, and a full
test suite. Next.js 16 (App Router) + TypeScript + shadcn/ui + Tailwind v4, backed by Supabase,
paid through Stripe, emailing through Resend, deployed on Vercel.

Nothing in that list needs to be built. Your job in this prompt is to **connect it to real
accounts and get it live**.

Before you do anything else, read `.claude/CLAUDE.md`. Every rule in it applies to everything
below, and it wins over this prompt wherever the two disagree. In particular: **pnpm only**
(never `npm`, never `yarn`), Stripe stays in **test mode**, every database change is additive,
and no secret ever reaches GitHub.

If `app/` or `.claude/CLAUDE.md` is missing, the unzip did not work — stop and say so instead
of trying to rebuild the project from memory.

## Ground rules for this whole run

- **Never print a secret value into the chat.** Say "I've set `STRIPE_SECRET_KEY`", never the
  key itself. Same for anything you write into `.env.local` or into Vercel.
- **Show progress as you go.** After each numbered step below, tell the person in one or two
  plain sentences what just happened and what is next. Never go silent for ten minutes.
- **Stripe stays in test mode.** Only ever `sk_test_...` keys and test-mode products. Test-mode
  card number for the demo is `4242 4242 4242 4242`, any future expiry, any CVC.
- **If a step fails, fix it yourself first.** Read the logs (Vercel MCP, Supabase MCP), diagnose,
  fix, retry. Only escalate to the person if the fix needs something only they have.
- **Keep a running checklist** with TodoWrite so the person can see where you are.

---

## Step 1 — Check the machine and install

1. `node --version` must be **24 or newer**. If it is older, stop and tell the person to install
   Node 24 LTS from nodejs.org — it is the one thing you cannot do for them.
2. `pnpm --version` must be **11.18.0 or newer**. If it is missing or older, fix it yourself:
   `corepack enable pnpm && corepack prepare pnpm@11.18.0 --activate`
3. Run `pnpm install`.

Do not run `pnpm build` yet — the app needs its environment variables first, and a build now
would fail for a reason that has nothing to do with the code.

## Step 2 — Check the MCP connections

This project expects four MCP servers, configured in `.mcp.json`: **GitHub, Vercel, Supabase and
Stripe**. Check which of them you actually have tools for right now.

- If any is missing, tell the person exactly which one and how to connect it (`/mcp` in Claude
  Code), and wait. Do not fall back to CLI commands or to clicking through dashboards for
  anything these four can do.
- **Resend has no MCP server.** Email is the one service where the person has to fetch a key by
  hand. That is expected — Step 5 covers it.

## Step 3 — Ask for everything you need, all at once

Use `AskUserQuestion` (or a single plain message) to ask for all of the following in **one**
round, so the person is not interrupted eight separate times. Explain in one line each what it
is for and exactly where to click.

1. **Product name** — shows up in page titles, emails and the marketing site.
2. **Supabase organisation and region** — you will list their organisations with the Supabase
   MCP first, then let them choose; region should be the one closest to their users.
3. **Supabase `service_role` key** — after you create the project, from
   _Supabase dashboard → their new project → Project Settings → API keys → `service_role`_.
   You can read the public URL and anon key through MCP, but never this one.
4. **Stripe test-mode secret key** (`sk_test_...`) — _Stripe dashboard → Developers → API keys →
   Secret key_, with **test mode toggled on**.
5. **Resend API key** (`re_...`) — _resend.com → API Keys → Create API Key_. Free account is fine.
6. **The email address that owns their Resend account** — this one matters more than it looks;
   see Step 5.
7. **GitHub repository name**, and whether it should be private (recommend private).

Tell them plainly: keys 3, 4 and 5 are secrets. You will write them into `.env.local` and into
Vercel, both of which stay out of GitHub, and you will never display them back.

## Step 4 — Create the database (Supabase MCP)

1. `list_organizations` → let the person pick (Step 3).
2. `get_cost` then `confirm_cost` for a new project — free tier is enough for a workshop.
3. `create_project` with the product name and the chosen region. It takes a few minutes;
   poll `get_project` until its status is healthy, and tell the person it is provisioning
   rather than sitting silent.
4. Apply every migration in `supabase/migrations/`, **in filename order**, using
   `apply_migration` — one call per file, passing the file's SQL exactly as written. Do not
   rewrite, merge or "improve" them. The order is:
   - `00000000000001_rate_limits.sql`
   - `20260823221800_profiles_and_roles.sql`
   - `20260823221801_mfa_otp_codes.sql`
   - `20260823221802_user_sessions.sql`
   - `20260823225100_subscriptions.sql`
   - `20260823225101_processed_stripe_events.sql`
   - `20260824120000_profile_avatar_and_storage.sql`
   - `20260824220000_backfill_missing_profiles.sql`
   - `20260824230000_grant_api_role_privileges.sql`

   (Ignore anything that is not a `.sql` file in that folder.)

5. `list_tables` to confirm the tables exist, and `get_advisors` for security warnings — fix
   anything it flags before moving on.
6. `get_project_url` and `get_publishable_keys` to collect `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the legacy `anon` key and the modern `sb_publishable_...`
   key both work in that variable — use whichever is not disabled).

## Step 5 — Email (Resend)

Take the key from Step 3 and set `RESEND_API_KEY`.

For `EMAIL_FROM_ADDRESS`, use `<Product Name> <onboarding@resend.dev>` unless the person
already has a domain verified in Resend.

**Say this out loud to the person, because it decides whether the live demo works:** while
sending from `onboarding@resend.dev`, Resend will only deliver to **the email address that owns
the Resend account**. So when they demo signup, they must sign up with that exact address —
any other address will silently receive nothing. If they want emails to reach anyone at all,
they need to verify a domain at _resend.com → Domains_ and put an address on that domain here.

## Step 6 — Payments (Stripe MCP, test mode)

Confirm you are in **test mode** before writing anything.

1. Create two products with recurring monthly prices — "Pro" and "Business" (or whatever the
   person renamed them to). Pick sensible demo amounts if they have no opinion.
2. Collect the two recurring Price IDs (`price_...`) → `STRIPE_PRICE_ID_PRO` and
   `STRIPE_PRICE_ID_BUSINESS`.
3. `STRIPE_SECRET_KEY` is the `sk_test_...` from Step 3.
4. Leave `STRIPE_WEBHOOK_SECRET` empty for now — the webhook needs the live URL, which does not
   exist until Step 10.

## Step 7 — Write `.env.local`

Generate the one value nobody has to look up: `OTP_HASH_SECRET`, via `openssl rand -hex 32`.

Then create `.env.local` in the project root with all of these. `docs/environment-variables.md`
explains each one in plain English if the person asks:

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OTP_HASH_SECRET=...
RESEND_API_KEY=...
EMAIL_FROM_ADDRESS="<Product Name> <onboarding@resend.dev>"
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_PRO=...
STRIPE_PRICE_ID_BUSINESS=...
```

**If your permissions block you from creating a file starting with `.env`** (this template ships
that rule on purpose), do not fight it and do not invent a different filename. Print the block
above with the real values filled in, tell the person to create a file named exactly
`.env.local` in the project root and paste it in, and wait for them to confirm before
continuing. `.env.local` is already in `.gitignore`, so it can never reach GitHub either way.

## Step 8 — Prove it works locally

In this order, fixing anything that fails before moving on:

1. `pnpm exec next typegen` (generates Next.js route types — `pnpm typecheck` fails on a fresh
   checkout without it)
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm exec oxlint .` and `pnpm exec oxfmt --check .`
5. `pnpm build`

Then start `pnpm dev` and check the app actually answers on `http://localhost:3000`. Report the
result in plain English.

## Step 9 — Put it on GitHub

The zip has no git history of its own, which is deliberate — this project gets a clean one.

1. `git init` (if there is no `.git` yet), `git add -A`, and a first commit. The secret-scanning
   hook runs automatically on commit; if it blocks you, fix the cause, never bypass it.
2. Create the repository with the **GitHub MCP** under the person's account, with the name and
   visibility from Step 3.
3. Add it as `origin` and push `main`. Ask before pushing, as `.claude/CLAUDE.md` requires.

GitHub Actions will run on that push. It is configured with safe dummy values, so it passes
without any repository secrets — no action needed there.

## Step 10 — Deploy to Vercel

1. `list_teams` with the Vercel MCP to get the `teamId`.
2. `create_git_project` pointing at the GitHub repo from Step 9. This links the repo so every
   future push deploys automatically.
3. **Environment variables.** The Vercel MCP cannot set them — this is a real gap, so use the
   Vercel CLI, and say so plainly rather than pretending MCP did it:
   ```
   pnpm dlx vercel@latest login
   pnpm dlx vercel@latest link --yes
   ```
   then add each variable from Step 7 for **production**, **preview** and **development**, e.g.
   ```
   printf '%s' "<value>" | pnpm dlx vercel@latest env add NEXT_PUBLIC_SUPABASE_URL production
   ```
   `pnpm dlx` is used instead of a global install because `npm` is blocked in this project.
   The `login` step opens a browser and needs one click from the person — warn them first.
4. Deploy to production and wait for it to finish. Note the resulting URL.
5. If the build fails, pull the logs with the Vercel MCP, fix the cause, and redeploy. Do not
   hand the person a stack trace.

## Step 11 — Close the loop on the two URL-dependent settings

The production URL only exists now, so two things have to be filled in afterwards:

1. **Stripe webhook.** Create a test-mode webhook endpoint at
   `https://<the-vercel-domain>/api/webhooks/stripe`, subscribed at minimum to
   `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted` and
   `invoice.payment_failed`. Take the signing secret (`whsec_...`) it returns and set
   `STRIPE_WEBHOOK_SECRET` in both `.env.local` and Vercel.
2. **`NEXT_PUBLIC_SITE_URL` in Vercel** must be the real production URL (not `localhost`) —
   password-reset links, verification links and Stripe's return URLs are all built from it.
   Leave `.env.local` on `http://localhost:3000` for local development.

Then redeploy so both take effect.

## Step 12 — One dashboard click you cannot do for them

Supabase's auth redirect allow-list has no MCP tool, so walk the person through it, precisely:

_Supabase dashboard → their project → Authentication → URL Configuration_

- **Site URL**: the production Vercel URL
- **Redirect URLs**: add both `https://<the-vercel-domain>/**` and `http://localhost:3000/**`

Explain why in one sentence: without it, the links inside password-reset and verification
emails quietly send people to the wrong page, with nothing in any log to explain it.

## Step 13 — Test it end to end, then report

On the deployed site, walk through it yourself where you can and tell the person exactly what
to click where you cannot:

1. Sign up — **with the Resend account owner's email address** (Step 5) — and confirm the
   verification email arrives.
2. Click the verification link, then log in.
3. Turn MFA on in settings, log out, log back in, and confirm the 6-digit code arrives by email.
4. Start a subscription with test card `4242 4242 4242 4242`, and confirm the plan shows as
   active in the billing settings afterwards (that is the Stripe webhook working).
5. Change the profile name and upload an avatar.

Finish with a short, plain-English summary: the live URL, the GitHub repo, what is connected
(database, email, payments), what is still in test mode, and what the obvious next step is.

## Step 14 — Optional: build the person's own idea on top

Only if they want to keep going in the same session.

Run `/setup` to personalize the boilerplate (product name, branding, which of the two demo
pricing tiers to keep). Then, if they paste a Blueprint or describe a feature:

- Treat the Blueprint as the source of truth for what to **add**, never as a reason to touch
  auth, billing, email or i18n — those are done.
- Anything non-trivial goes through the OpenSpec propose → implement → archive loop
  (`.claude/CLAUDE.md` section 14) instead of being improvised in chat.
- New tables follow `.claude/skills/safe-migrations/SKILL.md` and
  `.claude/skills/supabase-security/SKILL.md`: additive only, RLS on from the first migration.
- Run independent work in parallel — several named background subagents in a **single** message
  (`.claude/CLAUDE.md` section 16), never two agents on the same file, migration, or git
  operation.
- Every new feature gets at least one test before it counts as done.

**Blueprint:**
[PASTE YOUR BLUEPRINT HERE, OR DELETE THIS SECTION]
