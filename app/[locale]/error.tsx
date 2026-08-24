"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Catches uncaught errors anywhere under app/[locale] that aren't already handled by a more
 * specific boundary (e.g. app/[locale]/dashboard/error.tsx) — marketing pages, auth pages, and
 * the (marketing)/(auth) layouts themselves, since error.tsx wraps every nested segment below
 * the layout it sits alongside. Renders inside app/[locale]/layout.tsx, so next-intl's
 * NextIntlClientProvider is already in the tree and useTranslations works normally here. Must
 * be a Client Component — Next.js requires this for every error.tsx, no exceptions. See
 * https://nextjs.org/docs/app/api-reference/file-conventions/error.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const t = useTranslations("Errors.generic");

  useEffect(() => {
    // Message only, never the full error object or error.digest — never expose error.message
    // itself to the person (it can be an internal detail meant for logs, not user-facing copy;
    // that's why the UI below uses the translated catalog string instead). Same "message only"
    // convention as lib/email/send.ts's console.error — this one only ever reaches this one
    // user's own browser console, never a shared server log, but the rule still holds.
    console.error(error.message);
  }, [error]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-3">
          <Button onClick={reset} className="w-full">
            {t("retryAction")}
          </Button>
          <Link href="/" className="text-sm underline underline-offset-4">
            {t("homeAction")}
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
