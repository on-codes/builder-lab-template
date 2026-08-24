import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
};

/**
 * The other last-resort boundary alongside app/global-error.tsx — see that file for the full
 * explanation of why this project's true filesystem root has no app/layout.tsx above it
 * ([locale] is the true root segment). This one fires for a request that never resolves into
 * the [locale] segment structure at all: proxy.ts's matcher excludes paths like /_next/static,
 * /_next/image, and bare asset extensions from next-intl's rewriting (see the `config.matcher`
 * at the bottom of proxy.ts), so a request to one of those that doesn't match a real file or
 * route falls through to this file directly, never passing through app/[locale]/layout.tsx.
 * app/[locale]/not-found.tsx handles every other 404 (including an invalid locale) — this file
 * is only for the paths that never got that far.
 *
 * Same constraint as global-error.tsx, so the same fix: this isn't nested inside
 * app/[locale]/layout.tsx, so next-intl's NextIntlClientProvider, globals.css (Tailwind), and
 * shadcn/ui are not guaranteed to reach it. Plain hardcoded English text and inline styles, not
 * because this page is likely to be hit, but because it has to render correctly even when
 * nothing else the app relies on is guaranteed to be there. The one exception is `next/link`
 * (plain, not the locale-aware wrapper from i18n/navigation) for the home link below — it's a
 * bare Next.js primitive with no next-intl/Tailwind dependency of its own, so it carries none of
 * the risk this file is otherwise avoiding, and it's what Next's own docs use in this exact
 * file. See https://nextjs.org/docs/app/api-reference/file-conventions/not-found.
 *
 * Unlike error.tsx/global-error.tsx, not-found.tsx has no Client Component requirement, so this
 * stays a plain Server Component (no "use client", no hooks needed — there's no error object to
 * log here).
 */
export default function NotFound() {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          color: "#0a0a0a",
          backgroundColor: "#ffffff",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600 }}>Page not found</h1>
        <p style={{ margin: 0, maxWidth: "28rem", color: "#666666" }}>
          The page you are looking for does not exist or may have moved.
        </p>
        <Link
          href="/"
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.375rem",
            border: "1px solid #0a0a0a",
            backgroundColor: "#0a0a0a",
            color: "#ffffff",
            fontSize: "0.875rem",
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          Go home
        </Link>
      </body>
    </html>
  );
}
