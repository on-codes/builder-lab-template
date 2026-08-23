import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // Add a locale here later (e.g. ["en", "es"]) — nothing else about the routing needs to
  // change. See .claude/skills/i18n/SKILL.md.
  locales: ["en"],
  defaultLocale: "en",
  // The default locale gets no prefix: "/dashboard", never "/en/dashboard".
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
