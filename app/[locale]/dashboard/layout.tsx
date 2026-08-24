import { getTranslations } from "next-intl/server";
import type * as React from "react";
import { Link, redirect } from "@/i18n/navigation";
import { requireUser, UnauthorizedError, type AuthedUser } from "@/lib/auth/session";
import { DashboardNav } from "./dashboard-nav";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";

type DashboardLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function DashboardLayout({ children, params }: DashboardLayoutProps) {
  const { locale } = await params;

  // proxy.ts already redirects unauthenticated requests to /login before this layout ever
  // renders, but requireUser() is still the authoritative check (CLAUDE.md 1.1) — Server
  // Actions aren't behind proxy.ts, and neither, strictly, is this layout's own render path,
  // so this call stays here rather than assuming the redirect upstream already happened.
  let user: AuthedUser;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect({ href: "/login", locale });
    }
    throw error;
  }

  const common = await getTranslations("Common");

  return (
    <div className="flex min-h-svh flex-col">
      {/* Keyboard/screen-reader users can jump straight past the nav — invisible until it
          receives focus (Tab from the top of the page), then pinned in view. */}
      <a
        href="#main-content"
        className="bg-background text-foreground focus-visible:ring-ring sr-only rounded-md border px-4 py-2 text-sm font-medium focus:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-50 focus-visible:ring-2 focus-visible:outline-hidden"
      >
        {common("skipToContent")}
      </a>
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 md:px-6">
          <MobileNav />
          {/* min-w-0 lets this shrink below its natural width when the row is tight (mobile
              menu button + nav links + account menu all need their own space) — without it, a
              long product name (e.g. from /setup) wraps to a second line instead of eliding,
              which can exceed the header's fixed h-14 height. */}
          <Link href="/dashboard" className="min-w-0 truncate text-lg font-semibold tracking-tight">
            {common("appName")}
          </Link>
          <DashboardNav className="ml-6 hidden md:flex" />
          <div className="ml-auto flex items-center gap-2">
            <UserMenu email={user.email} />
          </div>
        </div>
      </header>
      {/* The one container every dashboard page's content renders into — consistent
          max-width/padding regardless of what the page itself does. Individual sections
          (e.g. Settings) are still free to narrow further inside this, see
          dashboard/settings/layout.tsx. */}
      <main id="main-content" className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">{children}</div>
      </main>
    </div>
  );
}
