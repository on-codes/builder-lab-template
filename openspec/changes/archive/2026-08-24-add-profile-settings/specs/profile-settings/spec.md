## Purpose

Lets an authenticated user view and manage their own display name, profile picture, and login
email from a dedicated `/dashboard/settings/profile` screen — the first-party equivalent of the
Security and Billing settings screens `add-auth-foundation` and `add-stripe-billing` already
shipped, and the last of the three tabs the Settings navigation reserved space for.

## ADDED Requirements

### Requirement: Display name can be updated

The system SHALL let an authenticated user set their own `profiles.display_name` to a
non-empty value up to 80 characters, and SHALL reject the request without touching the
database if the value is empty, whitespace-only, or over the limit.

#### Scenario: Valid name saved

- **WHEN** an authenticated user submits a new display name that is 1–80 characters after
  trimming whitespace
- **THEN** their `profiles.display_name` is updated to the trimmed value and the new value is
  returned to the caller

#### Scenario: Empty or oversized name rejected

- **WHEN** an authenticated user submits a display name that is empty, whitespace-only, or
  longer than 80 characters
- **THEN** the request is rejected with a validation error and `profiles.display_name` is left
  unchanged

#### Scenario: Unauthenticated request rejected

- **WHEN** the display name update is called without a valid session
- **THEN** the request is rejected and no row is changed

### Requirement: Profile picture upload and removal

The system SHALL let an authenticated user upload an image file as their profile picture,
replace it with a new one, or remove it entirely, and SHALL reject a file that is not an image
or exceeds 5 MB without storing it.

#### Scenario: Valid image uploaded

- **WHEN** an authenticated user uploads a PNG, JPEG, WebP, or GIF file of 5 MB or less
- **THEN** the file is stored in that user's own folder in the `avatars` bucket,
  `profiles.avatar_url` is set to its public URL, and that URL is returned to the caller

#### Scenario: Oversized or non-image file rejected

- **WHEN** an authenticated user uploads a file over 5 MB, or a file whose type is not one of
  the allowed image types
- **THEN** the request is rejected before anything is written to Storage or `profiles`, with a
  reason the screen can show (too large / wrong file type)

#### Scenario: Replacing a picture cleans up the old one

- **WHEN** an authenticated user who already has a profile picture uploads a new one
  successfully
- **THEN** `profiles.avatar_url` is updated to the new file's URL, and the previously stored
  file is removed from Storage afterward

#### Scenario: Removing a picture clears the avatar

- **WHEN** an authenticated user with a profile picture set requests to remove it
- **THEN** `profiles.avatar_url` is cleared and the stored file is removed from Storage

#### Scenario: Unauthenticated request rejected

- **WHEN** an avatar upload or removal is called without a valid session
- **THEN** the request is rejected and neither `profiles` nor Storage is changed

### Requirement: A user can only manage files inside their own avatar folder

The system SHALL enforce, at the Storage policy level, that a user can only insert, update, or
delete objects inside their own `avatars/<user_id>/` folder, independent of any application-code
check.

#### Scenario: Writing outside your own folder is denied

- **GIVEN** two authenticated users, A and B
- **WHEN** user A attempts to upload, replace, or delete an object under user B's
  `avatars/<user B's id>/` folder
- **THEN** the Storage policy denies the operation regardless of what any Server Action would
  otherwise allow

#### Scenario: Anyone can read an avatar URL

- **WHEN** any client (authenticated or not) requests an object in the `avatars` bucket by its
  URL
- **THEN** the read succeeds — the bucket is public by design (see `design.md`)

### Requirement: Changing the account email requires re-verifying the current password

The system SHALL require the correct current password before starting an email change, and
SHALL NOT generate or send any confirmation link if the submitted password is incorrect.

#### Scenario: Correct password required

- **WHEN** an authenticated user requests an email change and submits their correct current
  password along with a new email address
- **THEN** the identity check passes and the change proceeds to the confirmation step below

#### Scenario: Incorrect password rejected

- **WHEN** an authenticated user requests an email change but submits an incorrect current
  password
- **THEN** the request is rejected before any confirmation link is generated or sent, and the
  account's email is unchanged

### Requirement: Changing the account email requires confirming the new address

The system SHALL NOT change a user's login email until a confirmation link sent by this
process has been used, SHALL send that confirmation to both the current and the new email
address, and SHALL reject a request whose new address is unchanged or already belongs to
another account.

#### Scenario: Confirmation emailed to both addresses

- **WHEN** an email change request passes the password check with a new address that isn't
  already in use
- **THEN** a confirmation email is sent to the current address and a separate confirmation
  email is sent to the new address, and the account's email is unchanged until one is used

#### Scenario: Requesting the current email again is rejected

- **WHEN** the "new" email submitted is the same as the account's current email
  (case-insensitive)
- **THEN** the request is rejected before any email is sent

#### Scenario: Requesting an email already in use is rejected

- **WHEN** the submitted new email already belongs to a different account
- **THEN** the request is rejected with a specific reason, before any email is sent

### Requirement: Every profile Server Action re-checks authentication itself

The system SHALL independently verify the caller has a valid session inside each profile
Server Action (display name, avatar upload/removal, email change request), and SHALL NOT rely
on `proxy.ts` having already redirected an unauthenticated request, per
`.claude/CLAUDE.md` section 1.1.

#### Scenario: Every action rejects a missing/invalid session

- **WHEN** any of the profile Server Actions is called without a valid `bl_session` (e.g. a
  revoked session, or none at all)
- **THEN** that action rejects the call with an unauthorized error and makes no change

### Requirement: Sensitive profile actions are rate-limited

The system SHALL rate-limit avatar uploads and email-change requests per authenticated user,
per `.claude/skills/app-security/SKILL.md`.

#### Scenario: Avatar upload rate limit

- **WHEN** a user exceeds the configured avatar-upload rate limit within the configured window
- **THEN** further uploads are rejected until the window resets, without touching Storage or
  `profiles`

#### Scenario: Email change request rate limit

- **WHEN** a user exceeds the configured email-change-request rate limit within the configured
  window
- **THEN** further requests are rejected until the window resets, without generating or sending
  any confirmation link

### Requirement: Profile settings screen is reachable from Settings navigation

The system SHALL show a "Profile" tab in the Settings navigation, alongside the existing
Security and Billing tabs, linking to `/dashboard/settings/profile`.

#### Scenario: Profile tab present and correctly ordered

- **WHEN** an authenticated user views any `/dashboard/settings/*` screen
- **THEN** the Settings navigation shows a "Profile" tab that links to
  `/dashboard/settings/profile` and is marked current when that screen is active
