## MODIFIED Requirements

### Requirement: Primary navigation is reachable at every screen size

The system SHALL provide a persistent way to reach every top-level dashboard section from any
dashboard page, on both desktop and mobile viewports, presented as a left-hand navigation
sidebar with the same set of destinations and the same active-page indication in both
presentations.

#### Scenario: Desktop navigation

- **WHEN** the viewport is at or above the desktop breakpoint
- **THEN** a navigation sidebar is visible docked to the left edge of the screen, and the link
  matching the current page is visually marked as current (`aria-current="page"`)

#### Scenario: Mobile navigation

- **WHEN** the viewport is below the desktop breakpoint
- **THEN** the sidebar is hidden by default, and a menu button opens it as a full-height
  overlay panel containing the same links, each navigable and closing the panel on selection

#### Scenario: Settings stays highlighted across its sub-pages

- **WHEN** the current page is any `/dashboard/settings/*` screen (e.g. Security or Billing)
- **THEN** the sidebar's "Settings" group is expanded and the sub-link matching the current
  page (Security or Billing) is marked current — not just when the URL is that sub-link's own
  exact href

## ADDED Requirements

### Requirement: Sidebar can be collapsed to icon-only and remembers the choice

The system SHALL let the user collapse the desktop sidebar to a narrow icon-only rail and
expand it back, and SHALL remember the user's last choice across page loads in the same
browser.

#### Scenario: User collapses the sidebar

- **WHEN** the user activates the sidebar's collapse control (or its keyboard shortcut) on a
  desktop viewport
- **THEN** the sidebar narrows to show only icons, each still reachable and still labeled for
  assistive technology

#### Scenario: Collapsed state persists across page loads

- **WHEN** the user reloads the dashboard, or navigates to another dashboard page, in the same
  browser after collapsing the sidebar
- **THEN** the sidebar loads already collapsed, without first flashing expanded and then
  collapsing
