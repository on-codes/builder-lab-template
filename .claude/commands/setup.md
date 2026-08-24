---
description: Asks a few personalization questions and adapts this boilerplate for a new project.
---

You are personalizing the BuilderLab Template for a new project — not building it from
scratch. Auth, billing, email, i18n, a dashboard, and a marketing site already work out of the
box; `/setup` adapts what's already here to this person's idea, it doesn't scaffold anything.
Don't ask which platform — there is no mobile track. If the person asks for a mobile app,
explain that this template doesn't cover it and offer to build the dashboard instead.

## 1. Check the tools before running anything

- `node --version` must be **24 or newer** (Node 24 is the current LTS, and what CI and
  Vercel use). If it's older, stop and ask the person to install Node 24 LTS from nodejs.org —
  it's the one step you can't do for them.
- `pnpm --version` must be **11.18.0 or newer**. If the command fails or prints something
  older, fix it yourself with:
  `corepack enable pnpm && corepack prepare pnpm@11.18.0 --activate`

pnpm is this template's only package manager — never `npm`, never `yarn`.

## 2. Ask the personalization questions

Ask the person, in plain English, all at once:

> "A few quick questions to make this yours:
>
> 1. What's the product called? It shows up in page titles, emails, and the marketing site.
> 2. This template ships with two demo pricing tiers, Pro and Business — keep both, or just
>    one to start?
> 3. Do you need a second language yet, or just English for now? (Just English is the normal
>    answer — the plumbing for more languages is already built in for whenever you want it.)"

## 3. Apply the answers

- Update the product-name strings in `messages/en.json` — that's the one place in the app that
  holds user-facing text (`.claude/CLAUDE.md` section 10).
- Update the `title`/`description` in `app/layout.tsx`'s metadata to match.
- If they only want one tier, drop the unused one from the plan config that maps a plan
  identifier to a Stripe Price ID (`.claude/skills/stripe-billing/SKILL.md`) — leave the
  billing plumbing itself in place either way, it costs nothing to keep.
- If they want a second language starting today, treat it as its own follow-up feature (a new
  `messages/<locale>.json` plus one config entry) rather than doing it here — otherwise leave
  i18n as English-only for now.

## 4. Set up `.env.local`

Remind the person to fill in `.env.local` from `.env.example` (copy it first if `.env.local`
doesn't exist yet). Walk them through it in plain English, and keep the two categories
straight:

- **Safe for Claude to explain**: what each variable is for and exactly where in their own
  Supabase / Stripe / Resend dashboard to find it. Claude can point at the right settings page
  and describe what to copy.
- **Secrets only the person can get, and only they should type**: the Supabase service_role
  key, the Stripe secret key and webhook secret, the Resend API key, and anything else in that
  file that isn't a public/publishable value. These come from the person's own accounts —
  Claude never has them and never fills them in.

## 5. Verify

Run the standard checks and fix anything that fails before telling the person it's ready:

- `pnpm exec oxlint .` and `pnpm exec oxfmt --check .`
- `pnpm typecheck`
- `pnpm test`

Passing checks are the verification, not "it looks right."

## 6. Wrap up

Ask whether the 4 MCPs — GitHub, Vercel, Supabase, and Stripe — are connected; if not, explain
how to connect each one. Stripe is expected too now, since billing ships built-in by default
(section 13 of `.claude/CLAUDE.md`). Then give a short summary of what was personalized and
the suggested next step, in plain English.
