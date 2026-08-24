## Why

The Settings navigation already reserves a "Profile" tab (`Settings.nav.profile` in the
message catalog) but no page exists behind it yet — `settings-nav.tsx` deliberately leaves it
out of the tab list today rather than link somewhere that 404s. **For a non-technical project
owner**: right now your users can turn MFA on/off and manage billing, but they have no way to
change their own display name, add a profile picture, or change the email address they log in
with — three things almost every account settings page has. This adds all three, modeled on a
reference screenshot you shared (a "Profile" card with picture + name + save, and an "Email"
card with a "Change Email" action that requires confirming your identity first).

You already answered the two questions that shaped this proposal's scope, so this is a record
of that, not a new ask:

- **Profile pictures are real uploads**, stored in a new, dedicated file storage area — not
  just the initials circle used everywhere else today.
- **"Change Email" actually changes it**, after confirming your current password and clicking
  a confirmation link emailed to you — not a read-only field.

Both of those touch how your users log in and where their files live, so this proposal also
has a `design.md` (required by `.claude/CLAUDE.md` section 14 for anything touching auth).

## What Changes

- New Supabase schema: `profiles.avatar_url` (nullable text, additive), a new `avatars`
  Storage bucket (public read — see design.md for why), and Storage policies so a user can only
  upload/replace/remove files inside their own folder.
- New Server Actions: `updateDisplayName`, `uploadAvatar`/`removeAvatar` (5 MB limit,
  image files only, old file cleaned up after a successful replace), `requestEmailChange`
  (re-verifies the current password, then emails a confirmation link to both the old and new
  address before the change takes effect).
- New email template `confirm-email-change.tsx` (React Email, sent via the existing
  `sendEmail()`/Resend pipeline — never Supabase's own email).
- New screen: `/dashboard/settings/profile` — a "Profile" card (avatar with edit/remove, name
  field, save) and an "Email" card (current email, "Change Email" opening a small dialog for
  the new address + current password), styled with the same shadcn `Card`/`Form` components
  the Security and Billing screens already use.
- `settings-nav.tsx` gains the "Profile" tab (first in the list, matching the reference
  screenshot's ordering) using the message key that was already reserved for it.
- `user-menu.tsx`'s avatar shows the real uploaded picture when one is set, instead of always
  falling back to initials — otherwise an uploaded photo would be invisible everywhere except
  this one new screen.
- `next.config.ts`'s Content-Security-Policy `img-src` gains the Supabase project origin — its
  comment already flagged this as the one thing that would need to change "if a future change
  adds user-uploaded/remote avatars."

## Capabilities

### New Capabilities

- `profile-settings`: lets an authenticated user view and update their own display name,
  profile picture, and email address (with re-verification), independent of the `security`
  settings screen (MFA/sessions) and `billing` (subscription) already shipped.

### Modified Capabilities

_(none — `authentication` isn't modified; this adds a new, narrower entry point for one
already-authenticated user to change their own name/picture/email, it doesn't change how
signup, login, MFA, or password reset behave)_

## Impact

- New: `supabase/migrations/*_profile_avatar_and_storage.sql`, `lib/actions/profile/*`
  (`update-profile.ts`, `avatar.ts`, `change-email.ts`), `emails/confirm-email-change.tsx`,
  `app/[locale]/dashboard/settings/profile/{page,profile-settings-form}.tsx`.
- Changed: `settings-nav.tsx` (adds the Profile tab), `user-menu.tsx` (real avatar image when
  set), `next.config.ts` (CSP `img-src`), `messages/en.json` (new `Settings.Profile` and
  `Emails.confirmEmailChange` namespaces).
- No new dependency — everything needed (`@supabase/supabase-js` Storage client, React Email,
  Zod, react-hook-form) is already installed.
- No impact on the `authentication` or `billing` capabilities already shipped — this is
  additive, and nothing here changes login, signup, MFA, or subscription behavior.
