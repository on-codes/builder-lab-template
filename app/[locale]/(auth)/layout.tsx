import type * as React from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthShowcase } from "./auth-showcase";

type AuthLayoutProps = {
  children: React.ReactNode;
};

// Shell for every unauthenticated screen (login, signup, forgot/reset password, MFA challenge):
// the form centered on its own on small screens, paired with a branded showcase panel (see
// ./auth-showcase.tsx) in a second column from the `lg` breakpoint up. Route group, so "(auth)"
// never appears in the URL.
export default async function AuthLayout({ children }: AuthLayoutProps) {
  const common = await getTranslations("Common");

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <Link href="/" className="flex items-center gap-2 self-center font-semibold">
            {common("appName")}
          </Link>
          {children}
        </div>
      </div>
      <AuthShowcase />
    </div>
  );
}
