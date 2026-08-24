## Purpose

Lets a product built on this template give its users an account: sign up, verify their
email, log in, optionally require a second factor, recover a forgotten password, see and
revoke their own active sessions, and gives every future feature a `requireUser()`/
`requireRole()` extension point to gate on — without any of it being built again.

## ADDED Requirements

### Requirement: Account creation requires email verification

The system SHALL create an account from an email and password, and SHALL NOT allow that
account to log in until the email address has been verified via a emailed link.

#### Scenario: Signup succeeds, login is blocked until verified

- **WHEN** a new user submits a valid email and a password meeting the password policy
- **THEN** an account is created, a verification email is sent, and an attempt to log in
  before clicking the verification link is rejected with a message telling them to check
  their email

#### Scenario: Signup response does not reveal whether the email already exists

- **WHEN** someone submits signup with an email address that already has an account
- **THEN** the response is identical (wording and timing) to a successful new signup — no
  observable difference discloses that the account already existed

### Requirement: Password policy enforcement

The system SHALL reject a password that is below the minimum length/complexity bar or that
appears in a breached-password check, and SHALL NOT block signup solely because the
breached-password check itself could not be completed.

#### Scenario: Weak password rejected

- **WHEN** a user submits a password shorter than the minimum length or missing required
  complexity
- **THEN** signup is rejected with a specific, actionable reason (not a generic error)

#### Scenario: Breached password rejected

- **WHEN** a user submits a password that matches a known breached-password list
- **THEN** signup is rejected and the user is told to choose a different password

#### Scenario: Breach-check service unavailable

- **WHEN** the breached-password check cannot complete (network failure, timeout)
- **THEN** signup proceeds using only the length/complexity check, and the failure is logged
  server-side

### Requirement: Login and MFA challenge

The system SHALL authenticate a user by email and password, and SHALL require a second,
emailed one-time code before establishing a session for any user who has MFA enabled.

#### Scenario: Login without MFA

- **WHEN** a user with MFA disabled submits correct credentials
- **THEN** a session is established and the user reaches the dashboard directly

#### Scenario: Login with MFA enabled

- **WHEN** a user with MFA enabled submits correct credentials
- **THEN** no session is established yet; the user is redirected to the MFA challenge and a
  6-digit code is emailed to their address on file

#### Scenario: Incorrect credentials

- **WHEN** a user submits an email/password combination that doesn't match an account
- **THEN** login is rejected with a message that does not reveal whether the email exists

### Requirement: Email OTP behavior

The system SHALL treat an emailed one-time code as single-use, time-boxed, and attempt-capped.

#### Scenario: Correct code within the window

- **WHEN** the user submits the correct 6-digit code before it expires and before the attempt
  cap is reached
- **THEN** a session is established and the code can never be used again

#### Scenario: Expired code

- **WHEN** the user submits a code after its expiry window (5–10 minutes after issue)
- **THEN** the code is rejected regardless of correctness, and the user can request a new one

#### Scenario: Too many wrong attempts

- **WHEN** the user submits an incorrect code repeatedly, reaching the configured attempt cap
- **THEN** that code is locked out (rejected even if the correct code is submitted next) and
  the user must request a new one

#### Scenario: Resend is rate-limited

- **WHEN** the user requests a new code faster than the configured resend interval
- **THEN** the resend is rejected until the interval has passed

### Requirement: Forgot / reset password

The system SHALL let a user request a password reset by email, and SHALL enforce that the
reset link is single-use and time-limited, without revealing whether a submitted email has an
account.

#### Scenario: Reset requested for an existing account

- **WHEN** a user submits their email on the forgot-password screen
- **THEN** a reset email is sent if the account exists, and the on-screen response is
  identical either way

#### Scenario: Reset requested for a non-existent email

- **WHEN** someone submits an email with no matching account
- **THEN** the response is identical (wording and timing) to the existing-account case, and no
  email is sent

#### Scenario: Reset link used twice

- **WHEN** a reset link that has already been used to set a new password is opened again
- **THEN** it is rejected as invalid/expired, not silently accepted

#### Scenario: Expired reset link

- **WHEN** a reset link is opened after its expiry window
- **THEN** it is rejected and the user is told to request a new one

### Requirement: Session listing and revocation

The system SHALL let a logged-in user see their own active sessions and revoke any one of
them (including, optionally, the current one), and a revoked session SHALL lose access
immediately, not merely on its next token refresh.

#### Scenario: Viewing active sessions

- **WHEN** a logged-in user opens Security settings
- **THEN** they see a list of their own active sessions (at least: when it was created, and a
  device/browser label) and no other user's sessions

#### Scenario: Revoking another session

- **WHEN** a user revokes a session that is not the one they're currently using
- **THEN** that session's next request is rejected as unauthenticated, even if its underlying
  token has not yet expired

#### Scenario: Revoking the current session

- **WHEN** a user revokes the session they're currently using
- **THEN** they are immediately signed out and redirected to login

### Requirement: Route and Server Action protection

The system SHALL block unauthenticated access to any `(dashboard)` route at the routing layer,
and SHALL independently re-verify the user (and role, where applicable) inside every Server
Action that reads or writes user data, regardless of what the routing layer already checked.

#### Scenario: Unauthenticated request to a dashboard page

- **WHEN** a request with no valid session reaches any page under `(dashboard)`
- **THEN** it is redirected to login before any dashboard content renders

#### Scenario: Authenticated user reaches an auth-only page

- **WHEN** an already-authenticated user requests `/login` or `/signup`
- **THEN** they are redirected to the dashboard instead of seeing the auth form again

#### Scenario: Server Action called without a valid session

- **WHEN** a Server Action that requires a user is invoked without a valid, non-revoked
  session (e.g. a stale client, a forged request)
- **THEN** it rejects the call itself — it does not assume the routing layer already
  guaranteed a user is present

### Requirement: Role-based access extension point

The system SHALL associate exactly one role (`owner`, `admin`, or `member`) with every user
account, and SHALL provide a server-side check that loads the role from the database rather
than trusting any client-supplied value.

#### Scenario: New account gets a default role

- **WHEN** a new account is created
- **THEN** it is assigned the `owner` role without any explicit input from the user

#### Scenario: Role check ignores client-supplied values

- **WHEN** a request claims a role via a client-controlled value (a form field, a header, a
  stale cached claim) that doesn't match the database
- **THEN** the database value is what's enforced — the client-supplied value has no effect

### Requirement: Auth endpoint rate limiting

The system SHALL rate-limit login, signup, forgot-password, and OTP-resend requests to resist
brute force and enumeration, scoped per IP address for unauthenticated requests.

#### Scenario: Excessive login attempts from one source

- **WHEN** login requests from the same IP exceed the configured threshold within the
  configured window
- **THEN** further attempts from that IP are rejected until the window resets, independent of
  whether the credentials submitted are correct
