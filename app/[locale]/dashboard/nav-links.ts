// Shared between dashboard-nav.tsx (desktop, inline) and mobile-nav.tsx (the Sheet menu) so
// the two never drift out of sync — add a new top-level dashboard section here once, both
// navs pick it up. `labelKey` looks up under the `Dashboard.nav` message namespace.
export const NAV_LINKS = [
  { href: "/dashboard", labelKey: "home" },
  { href: "/dashboard/settings/security", labelKey: "settings" },
] as const;

/**
 * "Settings" stays highlighted across every /dashboard/settings/* screen (security, billing,
 * …), not just the one exact sub-page it links to — otherwise switching from Security to
 * Billing would visually turn the top-level "Settings" link off, which reads as a bug.
 */
export function isNavLinkActive(pathname: string, linkHref: string): boolean {
  if (linkHref === "/dashboard") return pathname === "/dashboard";
  if (linkHref.startsWith("/dashboard/settings")) return pathname.startsWith("/dashboard/settings");
  return pathname === linkHref;
}
