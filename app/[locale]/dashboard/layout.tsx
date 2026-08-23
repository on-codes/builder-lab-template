import { getTranslations } from "next-intl/server";
import type * as React from "react";
import { Separator } from "@/components/ui/separator";
import { Link, redirect } from "@/i18n/navigation";
import { requireUser, UnauthorizedError, type AuthedUser } from "@/lib/auth/session";
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
      <header>
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
            {common("appName")}
          </Link>
          <UserMenu email={user.email} />
        </div>
      </header>
      <Separator />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">{children}</div>
      </main>
    </div>
  );
}
