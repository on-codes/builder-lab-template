## Context

Builds on `add-auth-foundation` (profiles table, `requireUser()`, session model) and
`dashboard-shell-ux` (the settings tab-strip shell). No live Supabase/Vercel project is
reachable from this build session (same constraint `add-auth-foundation/design.md` recorded) —
schema and Server Actions are built and reasoned about as reviewable code, and this file says
explicitly, in Risks, which parts specifically need a smoke test against a real project before
the person relies on them.

## Goals / Non-Goals

**Goals:**

- A user can change their own display name, upload/replace/remove a profile picture, and
  change their login email — each independently, each re-checked server-side regardless of
  what the UI already validated.
- Changing email requires proving you still know the current password before anything is sent,
  and requires confirming the new address by email before the change actually takes effect —
  "requires verifying your identity first," matching the reference screenshot's own copy.
- A user can only ever read/write their own profile row and their own files in Storage — never
  another user's, enforced server-side (RLS + `requireUser()`), never by trusting a
  client-supplied id.

**Non-Goals:**

- Cropping/resizing the uploaded image client-side, or generating multiple sizes/thumbnails —
  the uploaded file is stored and served as-is (still capped at 5 MB and image-only). A future
  change can add cropping without touching this one's schema.
- Changing the _login method_ (e.g. adding social/OAuth login) — this only changes the email
  address tied to the existing email+password account.
- A "Preferences" tab, even though the reference screenshot shows one alongside Profile and
  Security — nothing in this project reserves that tab yet (unlike Profile, which already had
  a message key waiting for it) and nothing was asked for beyond the profile screen itself.
  Adding it is a separate, later change once there's an actual preference to put there.

## Decisions

**The `avatars` Storage bucket is public.** Every other piece of user data in this template
sits behind RLS/`service_role`-only access — this is a deliberate, narrow exception. A profile
picture is the one file in this app that's _meant_ to be shown to other people (the topbar
avatar, and anywhere else user identity is displayed later), and the standard way to do that
performantly is a public, cacheable URL rather than a signed URL that expires and needs
refreshing on every render. The URL itself is unguessable (a random UUID filename inside a
per-user folder, never the user's id or email), so this trades "technically anyone with the
exact URL can view it" for "no broken images, no expiring links, no extra round-trip" — the
same trade every mainstream SaaS product makes for avatars specifically. _Alternative
considered_: private bucket + signed URLs regenerated per page load — rejected as unnecessary
complexity for data that was never sensitive in the first place (a picture the user chose to
represent themselves publicly inside their own product).

**Only the `select` (read) Storage policy is unconditionally open; `insert`/`update`/`delete`
are scoped to the caller's own folder.** Object path convention: `avatars/<user_id>/<uuid>.<ext>`.
Every write policy checks `(storage.foldername(name))[1] = auth.uid()::text`, so a user can
never overwrite or delete another user's file even though anyone can _read_ any avatar URL.
Uploads/removals in this template's own Server Actions additionally go through the
`service_role` client (same convention `mfa-toggle.ts`/`sessions.ts` already use for writing to
`profiles`) — the Storage RLS policies are what would stop a compromised browser-side token
from writing outside its own folder, not what today's Server Actions rely on day-to-day, same
layered reasoning as every other table in this template.

**Avatar uploads use a fresh random filename per upload, never a fixed `avatar.<ext>`.** Two
reasons: (1) browsers/CDNs aggressively cache image URLs, so reusing the same filename after a
replace risks showing the old picture until a hard refresh; (2) it lets the old file be removed
_after_ the new one is confirmed stored, instead of overwriting in place, so a failed upload
never leaves the user with no avatar at all. The now-orphaned previous file is deleted
best-effort (fire-and-forget, logged on failure, never blocks the response) once the new
`avatar_url` is saved.

**Email change re-verifies the password via a real `signInWithPassword` call on this app's own
SSR (cookie-backed) Supabase client, not a hand-rolled comparison.** This is the same client
`lib/supabase/server.ts` already provides; calling it performs a genuine password grant against
Supabase Auth. On success it also refreshes that session's Supabase cookies for the same
user — harmless, and arguably a nice side effect (a fresher session). On failure, nothing is
sent and nothing about the current session changes. This app's own session-revocation layer
(`user_sessions`/`bl_session`, `lib/auth/session.ts`) is untouched either way — that's a
separate mechanism from Supabase's own auth cookie and isn't what this check exercises.
_Alternative considered_: Supabase's dedicated `reauthenticate()`/nonce API — that surface is
built around confirming a change that's already in flight via `updateUser()`, and its exact
shape is more version-sensitive than a plain password grant; skipped for the same
"don't guess at an admin-API surface without a live project to verify against" reasoning
`add-auth-foundation/design.md` used for session revocation.

**Email change always emails a confirmation link to _both_ the old and new address, generated
via the Admin API's `generateLink` (`email_change_current` + `email_change_new`) — the same
"generate the link, send it through our own template, never let Supabase send its own email"
pattern `signUp`/`requestPasswordReset` already use.** Supabase projects have a "Secure email
change" setting (in the hosted dashboard) that decides whether _both_ links must be confirmed
before the address actually changes, or just the new-address one — this template has no way to
read or rely on that per-project toggle (no live project connected to this build). Sending both
unconditionally works correctly either way: if the toggle is off, the old-address link is
simply unnecessary and harmless to receive; if it's on, the change would otherwise silently get
stuck waiting for a link this app never sent. _Alternative considered_: send only the new-address
link — rejected because it silently breaks for any project with "Secure email change" turned on,
and this template can't detect which state a given project is in.

**New display name and avatar writes go through the `service_role` client, scoped by
`.eq("id", user.id)` after `requireUser()`** — identical to how `mfa-toggle.ts` already writes
`profiles.mfa_enabled`. Kept consistent rather than switching to the RLS-enforced client for
just this one field.

## Risks / Trade-offs

- [Risk] The email-change flow (both `generateLink` calls, and whether "Secure email change"
  behaves as documented) is **not verified against a live Supabase project** — no MCP access in
  this build session, same limitation `add-auth-foundation/design.md` flagged for its own
  admin-API usage. → Mitigation: send both confirmation links unconditionally (see Decisions,
  which covers both toggle states); the person (or Claude, once Supabase is connected) should
  smoke-test one real email change end to end before relying on it in production — flagged
  again in `tasks.md`.
- [Risk] A public avatar bucket means the picture URL is reachable by anyone who has it, not
  just the logged-in user. → Mitigation: accepted by design (see Decisions) — unguessable
  per-user-folder UUID filenames, and a profile picture is the one asset in this template
  that's meant to be shown publicly inside the product in the first place.
- [Risk] `signInWithPassword` on the SSR client refreshes that session's Supabase auth cookie
  as a side effect of a successful reauth check. → Mitigation: same user, so this is at most a
  session refresh, never a takeover; this app's own revocable session layer
  (`user_sessions`/`bl_session`) is a separate mechanism and is untouched by this call either
  way.
- [Risk] Deleting the old avatar file after a successful replace is fire-and-forget — a
  transient Storage failure leaves one orphaned file rather than blocking the user's upload on
  cleanup succeeding. → Mitigation: accepted — an orphaned old file costs a small amount of
  Storage and is invisible to the user (the `profiles.avatar_url` row already points at the new
  one); logged server-side so Claude can see how often it happens.

## Migration Plan

Additive only, per `.claude/skills/safe-migrations/SKILL.md`: one new nullable column, one new
Storage bucket, four new Storage policies — nothing pre-existing is altered. No rollback plan
needed for a purely additive change.

## Open Questions

- Whether to add basic client-side image cropping/resizing in a later pass — a UX
  nice-to-have, not a schema or security decision, deliberately out of scope here (see
  Non-Goals).
- Whether a future change should also show the avatar next to `display_name` anywhere else in
  the dashboard shell beyond the topbar menu (e.g. a dashboard welcome greeting) — left alone
  in this change since nothing asked for it.
