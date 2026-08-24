## Purpose

Gives every unauthenticated screen (login, signup, forgot/reset password, MFA challenge) one
shared layout, so adding another auth-adjacent screen later gets the same structure for free
instead of rebuilding it — and gives visitors a branded, informative screen instead of a bare
form on blank space.

## ADDED Requirements

### Requirement: Two-column shell on wide viewports

The system SHALL render every screen under the `(auth)` route group inside a shared layout that,
at the `lg` breakpoint and above, shows the page's form in the left column and a branded
showcase panel in the right column, and that, below the `lg` breakpoint, shows only the form
column.

#### Scenario: Wide viewport shows both columns

- **WHEN** an auth screen (e.g. `/login`) is viewed at a viewport width at or above the `lg`
  breakpoint
- **THEN** both the form column and the showcase panel are visible, side by side

#### Scenario: Narrow viewport shows only the form

- **WHEN** the same screen is viewed below the `lg` breakpoint
- **THEN** only the form column is visible — the showcase panel is not rendered visibly and is
  not reachable via the accessibility tree

### Requirement: Showcase panel content is sourced from existing marketing copy

The system SHALL populate the showcase panel with the product name, headline, subheading, and
feature highlights already defined for the marketing homepage, and SHALL NOT introduce new
marketing copy, or any auth affordance (e.g. social login) that the rest of the template does
not actually implement.

#### Scenario: Showcase renders brand and value props

- **WHEN** the showcase panel is visible
- **THEN** it shows a link back to the marketing homepage carrying the product name, the
  marketing homepage's hero headline and subheading, and the same four feature highlights shown
  on the marketing homepage

#### Scenario: No unimplemented auth affordances are shown

- **WHEN** any auth screen renders, with or without the showcase panel visible
- **THEN** it offers only the auth methods this template actually implements (email/password,
  email MFA) — no social-login button or other control that doesn't correspond to working
  functionality

### Requirement: Shared shell applies uniformly, forms unchanged

The system SHALL apply the two-column shell to every screen in the `(auth)` route group through
one shared layout rather than per-page duplication, and SHALL NOT alter the fields, validation,
or submission behavior of any existing auth form to do so.

#### Scenario: Every auth route uses the shared shell

- **WHEN** any of `/login`, `/signup`, `/forgot-password`, `/reset-password`, or `/verify-mfa`
  is requested
- **THEN** it renders inside the same shared layout, without its own copy of the two-column
  structure

#### Scenario: Form behavior is unaffected

- **WHEN** an existing auth form (e.g. login) is submitted through the new shell
- **THEN** it behaves exactly as before the shell change — same fields, same validation
  messages, same success/error handling
