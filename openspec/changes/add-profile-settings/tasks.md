## 1. Schema & Storage (additive, RLS from creation)

- [x] 1.1 Migration: `profiles.avatar_url` (nullable text)
- [x] 1.2 Migration: `avatars` Storage bucket (public, with `file_size_limit` +
      `allowed_mime_types`), policies scoped to `avatars/<user_id>/` for select/insert/update/
      delete (public reads are served via the bucket's `public` flag, which bypasses RLS
      entirely — the `select` policy only gates the Storage API's own list/download surface,
      see `design.md` Decisions)
- [x] 1.3 `next.config.ts`: CSP `img-src` gains the Supabase project origin, and
      `experimental.serverActions.bodySizeLimit` raised to 6mb (found during security review —
      Next's 1MB default would have made the app's own 5MB check unreachable, see `design.md`
      Risks)

## 2. Server Actions

- [x] 2.1 `lib/actions/profile/update-profile.ts` — `updateDisplayName`
- [x] 2.2 `lib/actions/profile/avatar.ts` — `uploadAvatar` (type/size validation, old file
      cleanup), `removeAvatar`
- [x] 2.3 `lib/actions/profile/change-email.ts` — `requestEmailChange` (password
      re-verification, dual `generateLink` + dual send, same-email/already-in-use rejection)
- [x] 2.4 Rate limiting applied to `uploadAvatar` and `requestEmailChange` per `app-security`
      skill's per-user convention (email-change capped at 2/hour, not just under an arbitrary
      number — 2 requests × 2 emails each stays under the shared 5/hour per-user email cap in
      `checkEmailSendLimit`, so this feature alone can never trip it and silently drop one of
      the pair)

## 3. Email template

- [x] 3.1 `emails/confirm-email-change.tsx` + `subject()`, wrapped in `<EmailLayout>`, copy
      from `Emails.confirmEmailChange` in the message catalog

## 4. i18n

- [x] 4.1 `messages/en.json`: `Settings.Profile.*` (screen copy), `Settings.nav.profile`
      already exists — wired in, `Emails.confirmEmailChange.*`

## 5. Screen

- [x] 5.1 `app/[locale]/dashboard/settings/profile/page.tsx` — loads `profiles`
      (`display_name`, `avatar_url`) + the session email server-side
- [x] 5.2 `app/[locale]/dashboard/settings/profile/profile-settings-form.tsx` — Profile card
      (avatar edit/remove, name field, save) + Email card (current email, Change Email dialog)
- [x] 5.3 `settings-nav.tsx` — added the Profile tab (first in the list)
- [x] 5.4 `user-menu.tsx` — shows the real avatar image when `avatar_url` is set

## 6. Tests

- [x] 6.1 `update-profile.test.ts` — happy path + rejected (invalid input, unauthorized)
- [x] 6.2 `avatar.test.ts` — happy path (upload/replace/remove), rejected (too large, wrong
      type, unauthorized, rate-limited)
- [x] 6.3 `change-email.test.ts` — happy path, wrong password, same email, email already in
      use, rate-limited, unauthorized, send-failure-still-succeeds
- [x] 6.4 `confirm-email-change.test.tsx` — render-to-string test, key content/links
- [x] 6.5 `profile-settings-form.test.tsx` — renders current values, calls the right action on
      submit for name/avatar/email-change, surfaces a field error on wrong password
- [x] 6.6 `settings-nav.test.tsx` (new) — Profile tab present, correctly ordered, links
      correctly; `user-menu.test.tsx` extended for name-derived initials

## 7. Verification

- [x] 7.1 `pnpm exec oxlint .`, `pnpm exec oxfmt --check .`, `pnpm typecheck`, `pnpm test`
      (120/120) all pass on the combined result; a full `next build` (17 routes) also verified
- [x] 7.2 `.claude/hooks/validate-migration.sh` passes on the new migration
- [x] 7.3 `security-reviewer` pass completed — found and fixed a Storage `select`-policy
      enumeration gap and the Server Action body-size-limit issue above; one residual risk
      (client-declared `file.type`, not magic-byte-verified) accepted and documented in
      `design.md` rather than fixed unrequested
- [x] 7.4 Every scenario in `specs/profile-settings/spec.md` checked against the finished
      code — all pass except the Storage-policy scenarios (RLS enforcement, public read),
      which are correct-by-construction/reviewed SQL but not runnable against a live project
      from this build session (see `design.md` Risks)
- [x] 7.5 Flagged in the PR description: the email-change flow (and the Storage policies)
      need one real smoke-test against a live Supabase project before relying on them in
      production — no live project reachable from this build session (see `design.md` Risks)
