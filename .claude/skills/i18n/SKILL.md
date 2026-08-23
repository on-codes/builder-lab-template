---
name: i18n
description: Use this skill whenever you add or edit any user-facing string — in the app or in an email template — or set up next-intl routing/config. Covers the messages/<locale>.json catalog, useTranslations vs getTranslations for client/server components, and keeping routing ready for a second locale without a rewrite.
---

# i18n — English today, ready for more locales without a rewrite

This template ships with exactly one locale (`messages/en.json`) and no visible language
switcher. That's a product decision, not a technical shortcut: every user-facing string still
goes through `next-intl`'s message catalog from day one — auth screens, the dashboard,
marketing pages, emails, even validation copy — never a hardcoded English string in JSX or a
template literal. Retrofitting i18n after strings are scattered through the codebase is real,
error-prone work; doing the setup once now means a second locale later is "add
`messages/<locale>.json` and one line in a config array," never a code change.

## Setup

```ts
// i18n/routing.ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en"], // add a locale here later, e.g. ["en", "es"]
  defaultLocale: "en",
  localePrefix: "as-needed", // the default locale gets no prefix: "/dashboard", never "/en/dashboard"
});

// i18n/navigation.ts — locale-aware Link/redirect, used instead of next/link, next/navigation
import { createNavigation } from "next-intl/navigation";
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);

// i18n/request.ts — loads the right message file for each request
import { getRequestConfig } from "next-intl/server";
export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? routing.defaultLocale;
  return { locale, messages: (await import(`../messages/${locale}.json`)).default };
});
```

Register the plugin in `next.config.ts` (`createNextIntlPlugin("./i18n/request.ts")`), wrap
pages in `NextIntlClientProvider` from `app/[locale]/layout.tsx`, and run next-intl's own
`createMiddleware(routing)` from `proxy.ts` — this template's route-protection file
(`middleware.ts` is the deprecated name, see `CLAUDE.md` 1.1).

`messages/en.json` is namespaced by screen/feature, matching the string passed to
`useTranslations` / `getTranslations`:

```json
{
  "Dashboard": {
    "welcomeTitle": "Welcome back",
    "metadata": { "title": "Dashboard" },
    "actions": { "save": "Save changes" }
  }
}
```

## Routing with a single locale

Pages already live under `app/[locale]/...`, even though only `en` exists — that's the part
that's tedious to retrofit later, so it's done once, now. `localePrefix: "as-needed"` means
the default locale is never shown in the URL, so today every route looks exactly like a
non-i18n app (`/dashboard`, `/settings/billing`, never `/en/dashboard`). When a second locale
is needed, add it to the `locales` array in `routing.ts` and drop in `messages/<locale>.json`
— the `[locale]` segment, the middleware, and the prefix logic already know what to do with
it. Nothing under `app/` moves or gets rewritten.

Always link and redirect through `i18n/navigation.ts` (`Link`, `redirect`, `usePathname`,
`useRouter`), never raw `next/link` / `next/navigation` — that's what keeps every link correct
automatically once a route needs a prefix.

## Reading translations: Server vs. Client components

Server Components — and `generateMetadata`, which also runs server-side, outside any
component — can't use hooks, so they call `getTranslations` instead of `useTranslations`:

```tsx
// app/[locale]/dashboard/page.tsx — Server Component
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("Dashboard.metadata");
  return { title: t("title") };
}

export default async function DashboardPage() {
  const t = await getTranslations("Dashboard");
  return <h1>{t("welcomeTitle")}</h1>;
}
```

```tsx
// components/save-button.tsx — Client Component
"use client";
import { useTranslations } from "next-intl";

export function SaveButton() {
  const t = useTranslations("Dashboard.actions");
  return <button type="submit">{t("save")}</button>;
}
```

Outside the request lifecycle entirely — a Stripe webhook, an email send — there's no ambient
locale to read, so pass it in explicitly: `getTranslations({ locale, namespace: "Emails.mfaCode" })`.
See `.claude/skills/email-templates/SKILL.md`.

## The non-negotiable rule

If a person will ever read it, it comes from the message catalog: page copy, button labels,
toasts, empty states, and Zod validation messages surfaced to the user — not just headlines.
"It's only English right now" is never a reason to inline a string. The catalog is the
product from day one, even with a single locale in it.

## Checklist before marking i18n-touching work done

- [ ] No hardcoded user-facing string anywhere — JSX, toasts, and validation messages all go
      through `t()` / `useTranslations()` / `getTranslations()`
- [ ] New keys added to `messages/en.json` under a sensible namespace, not dumped at the top
      level
- [ ] Server Components and `generateMetadata` use `getTranslations`; Client Components use
      `useTranslations`
- [ ] Code outside the request lifecycle (emails, webhooks) passes `locale` explicitly instead
      of assuming ambient request context
- [ ] Links/redirects use `i18n/navigation.ts`, not raw `next/link` / `next/navigation`
