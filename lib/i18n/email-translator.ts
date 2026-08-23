import { createTranslator } from "use-intl/core";
import type { Locale } from "@/i18n/routing";

/**
 * Email templates render outside the Next.js request lifecycle, in at least three different
 * bundlers (the actual server at send time, Vitest in tests, and the `react-email` CLI's own
 * bundler for `pnpm email:dev`) — none of which reliably set the "react-server" package
 * export condition `next-intl/server`'s `getTranslations` depends on. `use-intl`'s
 * `createTranslator` is the same engine next-intl uses internally, minus that Next.js-specific
 * wiring, so it works identically in all three. See .claude/skills/i18n/SKILL.md and
 * .claude/skills/email-templates/SKILL.md.
 *
 * Deliberately NOT `import "server-only"` here, unlike most of lib/ — this module (and every
 * email template that transitively imports it) needs to import cleanly under Vitest's jsdom
 * environment and the react-email CLI, neither of which is "the browser" in the sense
 * server-only guards against, but both of which resolve package.json export conditions in a
 * way that trips server-only's client-detection. It reads no secret and touches no server-only
 * API, so the guard has nothing to protect here anyway.
 */
export async function getEmailTranslator(locale: Locale, namespace: string) {
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return createTranslator({ locale, messages, namespace });
}
