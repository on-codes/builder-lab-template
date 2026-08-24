"use client";

import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * The last-resort boundary: fires only when the root layout itself (app/[locale]/layout.tsx,
 * including the locale-detection check it does before rendering anything) throws. There is no
 * app/layout.tsx above app/[locale]/layout.tsx in this project — [locale] is the true root
 * segment — so this file lives at the true filesystem root (app/global-error.tsx), not inside
 * app/[locale]/, exactly as Next's docs describe: global-error.js "replaces the root layout"
 * and must work "even when leveraging internationalization"
 * (https://nextjs.org/docs/app/api-reference/file-conventions/error#global-error).
 *
 * Because it replaces the root layout, it renders its own complete <html>/<body> — Next.js
 * requires that. It deliberately does NOT use next-intl (NextIntlClientProvider lives in the
 * layout this component is standing in for, so it will not be available — using
 * useTranslations here would throw during the one moment this component's entire job is to
 * not throw), shadcn/ui components, Tailwind utility classes (globals.css is loaded by the
 * layout this replaces, so it isn't guaranteed to reach this file either — see the docs link
 * above), or any other app dependency. Plain hardcoded English text and inline styles only:
 * this is the "everything else already failed" fallback, so it has to be the one component in
 * the app that cannot itself fail.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Message only, never the full error object or error.digest — same convention as
    // lib/email/send.ts and the other two error boundaries in this app. This only ever reaches
    // this one user's own browser console, never a shared server log.
    console.error(error.message);
  }, [error]);

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
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600 }}>Something went wrong</h1>
        <p style={{ margin: 0, maxWidth: "28rem", color: "#666666" }}>
          We hit a problem loading the app. Try again, or come back in a moment.
        </p>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.375rem",
              border: "1px solid #0a0a0a",
              backgroundColor: "#0a0a0a",
              color: "#ffffff",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {/* A plain <a>, deliberately not next/link's <Link>: this file's whole job is to
              render even when the rest of the app can't, so it avoids every dependency it
              can, including the router. A full page navigation is also the more reliable
              recovery here anyway, given whatever broke the root layout in the first place. */}
          {/* eslint-disable-next-line next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.375rem",
              border: "1px solid #d4d4d4",
              color: "#0a0a0a",
              fontSize: "0.875rem",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Go home
          </a>
        </div>
      </body>
    </html>
  );
}
