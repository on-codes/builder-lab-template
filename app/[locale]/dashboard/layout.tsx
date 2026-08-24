import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import type * as React from "react";
import { Separator } from "@/components/ui/separator";
import {
  SIDEBAR_COOKIE_NAME,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { redirect } from "@/i18n/navigation";
import { requireUser, UnauthorizedError, type AuthedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "./app-sidebar";

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
  const navT = await getTranslations("Dashboard.nav");

  // A plain UI-preference cookie (never "false" until the person actually collapses the
  // sidebar once), read here so the very first render already matches their last choice
  // instead of flashing expanded-then-collapsed after the page loads — see
  // components/ui/sidebar.tsx for where this same cookie gets written back on toggle.
  const cookieStore = await cookies();
  const sidebarOpen = cookieStore.get(SIDEBAR_COOKIE_NAME)?.value !== "false";

  // Best-effort — the topbar avatar/name are a nice-to-have, never worth failing the whole
  // dashboard shell over. UserMenu falls back to email-initials the same way it always did if
  // this comes back empty.
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      {/* Keyboard/screen-reader users can jump straight past the nav — invisible until it
          receives focus (Tab from the top of the page), then pinned in view. */}
      <a
        href="#main-content"
        className="bg-background text-foreground focus-visible:ring-ring sr-only rounded-md border px-4 py-2 text-sm font-medium focus:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-50 focus-visible:ring-2 focus-visible:outline-hidden"
      >
        {common("skipToContent")}
      </a>
      <AppSidebar
        email={user.email}
        appName={common("appName")}
        displayName={profile?.display_name}
        avatarUrl={profile?.avatar_url}
      />
      {/* The one container every dashboard page's content renders into — consistent
          max-width/padding regardless of what the page itself does. Individual sections
          (e.g. Settings) are still free to narrow further inside this, see
          dashboard/settings/layout.tsx. */}
      <SidebarInset id="main-content">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 md:px-6">
          <SidebarTrigger aria-label={navT("toggleSidebar")} />
          <Separator orientation="vertical" className="h-4" />
        </header>
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
