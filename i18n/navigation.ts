import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

// Locale-aware Link/redirect/usePathname/useRouter — always import these instead of
// next/link / next/navigation, so every link/redirect stays correct once a route needs a
// locale prefix. See .claude/skills/i18n/SKILL.md.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
