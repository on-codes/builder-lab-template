---
description: Quick security audit of the project — RLS, keys, rate limiting, emails, payments, MFA, i18n, migrations.
---

Go through the checklist below and report each item as ✅ or ❌ with what's missing:

1. **RLS** — every table in `supabase/migrations/**` has `enable row level security` and at
   least one policy per operation used by the application (`.claude/skills/supabase-security/SKILL.md`).
2. **Keys** — no versioned file (other than `.env.example`) contains a real key;
   run `bash .claude/hooks/check-secrets.sh` to confirm.
3. **Migrations** — no applied migration contains `drop`, `alter column ... type`, or
   `rename` without an explicit `ALLOW-DESTRUCTIVE` comment.
4. **Rate limiting** — every public route (Route Handler / Server Action / Edge Function) uses
   `checkRateLimit` or an equivalent (`.claude/skills/app-security/SKILL.md`).
5. **Emails** — any email sending respects the per-user limit defined in the project.
6. **Payments** — billing ships built-in by default now, so this check always runs
   (`.claude/CLAUDE.md` section 8): test keys in use unless the person has explicitly
   confirmed live mode, the webhook validates the Stripe signature, and the webhook handler is
   idempotent (checks `event.id` against already-processed events before acting).
7. **MFA** — the email OTP flow is rate-limited (resend), time-boxed (5–10 minute expiry),
   single-use, and attempt-capped with a lockout (`.claude/CLAUDE.md` section 9).
8. **i18n** — no hardcoded user-facing strings outside the message catalog
   (`messages/en.json`), in the app or in email templates (`.claude/CLAUDE.md` section 10).
9. **Tests** — minimum coverage exists for the database policies and the critical routes.

At the end, give a summary in plain English: how many items are ok, which ones need attention,
and fix whatever can be fixed automatically without asking for additional confirmation.
