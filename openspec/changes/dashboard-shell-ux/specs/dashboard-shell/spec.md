## Purpose

Gives every authenticated screen in this template a consistent navigation chrome, a documented
content container, friendly error/not-found handling, and a layout that holds up from a phone
to a desktop — so a new page added on top of this template inherits all of that for free
instead of every feature needing its own navigation/error-handling decision.

## ADDED Requirements

### Requirement: Primary navigation is reachable at every screen size

The system SHALL provide a persistent way to reach every top-level dashboard section from any
dashboard page, on both desktop and mobile viewports, using the same set of links and the same
active-page indication in both presentations.

#### Scenario: Desktop navigation

- **WHEN** the viewport is at or above the desktop breakpoint
- **THEN** the primary nav links are visible inline in the header, and the link matching the
  current page is visually marked as current (`aria-current="page"`)

#### Scenario: Mobile navigation

- **WHEN** the viewport is below the desktop breakpoint
- **THEN** the inline links are hidden and a menu button opens a panel containing the same
  links, each navigable and closing the panel on selection

#### Scenario: Settings stays highlighted across its sub-pages

- **WHEN** the current page is any `/dashboard/settings/*` screen (e.g. Security or Billing)
- **THEN** the "Settings" nav link is marked current, not just when the URL is its own exact
  href

### Requirement: Keyboard and screen-reader users can skip repeated navigation

The system SHALL provide a mechanism for keyboard/assistive-technology users to jump directly
to a page's main content without tabbing through the navigation on every page.

#### Scenario: Skip link receives focus first

- **WHEN** a keyboard user presses Tab from the top of a dashboard page
- **THEN** a "skip to main content" control is the first focusable element, and activating it
  moves focus to the page's main landmark

### Requirement: Errors show a friendly, on-brand message, never a raw failure

The system SHALL catch runtime errors at the locale-wide, dashboard, and root levels and
present a plain-English message with a way to recover, and SHALL NOT display the error's raw
message/stack trace to the user.

#### Scenario: An error occurs inside the dashboard

- **WHEN** a runtime error is thrown while rendering a dashboard page
- **THEN** the dashboard's navigation chrome remains visible, the content area shows a friendly
  message with a retry action, and no internal error detail is shown

#### Scenario: An error occurs outside the dashboard, or in the root layout itself

- **WHEN** a runtime error is thrown in a marketing/auth page, or in the root layout that even
  the locale-wide error boundary depends on
- **THEN** a friendly fallback still renders (the locale-wide boundary for the former, a
  minimal last-resort boundary with no external dependencies for the latter) instead of a
  blank page or a framework default error screen

### Requirement: Unmatched routes show a friendly not-found page

The system SHALL show a plain-English "not found" page for any URL that doesn't match a real
route, at the locale-wide, dashboard, and true-root levels, and SHALL NOT show the framework's
unstyled default.

#### Scenario: Unmatched route inside the dashboard

- **WHEN** a request is made for a `/dashboard/*` path with no matching page
- **THEN** the dashboard's navigation chrome remains visible and the content area shows a
  friendly not-found message with a way back to the dashboard

#### Scenario: Unmatched route elsewhere

- **WHEN** a request is made for any other unmatched path within a known locale
- **THEN** a friendly not-found message renders with a way back to the marketing home page

### Requirement: Layout holds up from phone to desktop width

The system SHALL render every dashboard, marketing, and auth page without horizontal overflow,
overlapping elements, or unreachably small touch targets at common phone (≈375px), tablet
(≈768px), and desktop (≈1280px) widths.

#### Scenario: Narrow viewport

- **WHEN** a page is viewed at a phone-width viewport
- **THEN** the page requires no horizontal scrolling to read its content, and every interactive
  control remains individually tappable
