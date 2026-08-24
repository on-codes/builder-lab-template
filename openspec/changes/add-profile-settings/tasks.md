## 1. Schema & Storage (additive, RLS from creation)

- [ ] 1.1 Migration: `profiles.avatar_url` (nullable text)
- [ ] 1.2 Migration: `avatars` Storage bucket (public), policies scoped to
      `avatars/<user_id>/` for insert/update/delete, open select
- [ ] 1.3 `next.config.ts`: CSP `img-src` gains the Supabase project origin

## 2. Server Actions

- [ ] 2.1 `lib/actions/profile/update-profile.ts` — `updateDisplayName`
- [ ] 2.2 `lib/actions/profile/avatar.ts` — `uploadAvatar` (type/size validation, old file
      cleanup), `removeAvatar`
- [ ] 2.3 `lib/actions/profile/change-email.ts` — `requestEmailChange` (password
      re-verification, dual `generateLink` + dual send, same-email/already-in-use rejection)
- [ ] 2.4 Rate limiting applied to `uploadAvatar` and `requestEmailChange` per `app-security`
      skill's per-user convention

## 3. Email template

- [ ] 3.1 `emails/confirm-email-change.tsx` + `subject()`, wrapped in `<EmailLayout>`, copy
      from `Emails.confirmEmailChange` in the message catalog

## 4. i18n

- [ ] 4.1 `messages/en.json`: `Settings.Profile.*` (screen copy), `Settings.nav.profile`
      already exists — wire it in, `Emails.confirmEmailChange.*`

## 5. Screen

- [ ] 5.1 `app/[locale]/dashboard/settings/profile/page.tsx` — loads `profiles`
      (`display_name`, `avatar_url`) + the session email server-side
- [ ] 5.2 `app/[locale]/dashboard/settings/profile/profile-settings-form.tsx` — Profile card
      (avatar edit/remove, name field, save) + Email card (current email, Change Email dialog)
- [ ] 5.3 `settings-nav.tsx` — add the Profile tab (first in the list)
- [ ] 5.4 `user-menu.tsx` — show the real avatar image when `avatar_url` is set

## 6. Tests

- [ ] 6.1 `update-profile.test.ts` — happy path + rejected (invalid input, unauthorized)
- [ ] 6.2 `avatar.test.ts` — happy path (upload/replace/remove), rejected (too large, wrong
      type, unauthorized)
- [ ] 6.3 `change-email.test.ts` — happy path, wrong password, same email, unauthorized
- [ ] 6.4 `confirm-email-change.test.tsx` — render-to-string test, key content/links
- [ ] 6.5 `profile-settings-form.test.tsx` — renders current values, calls the right action on
      submit
- [ ] 6.6 `settings-nav.test.tsx` (new or extended) — Profile tab present and links correctly

## 7. Verification

- [ ] 7.1 `pnpm exec oxlint .`, `pnpm exec oxfmt --check .`, `pnpm typecheck`, `pnpm test` all
      pass
- [ ] 7.2 `.claude/hooks/validate-migration.sh` passes on the new migration
- [ ] 7.3 `security-reviewer` pass over the new Server Actions, Storage policies, and screen
- [ ] 7.4 Every scenario in `specs/profile-settings/spec.md` checked against the finished code
- [ ] 7.5 Flag clearly, in the PR description, that the email-change flow needs one real
      smoke-test against a live Supabase project before relying on it in production (see
      `design.md` Risks — no live project reachable from this build session)
