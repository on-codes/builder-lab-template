"use client";

import { ChevronRightIcon, LayoutDashboardIcon, SettingsIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { UserMenu } from "./user-menu";

type AppSidebarProps = {
  email: string;
  appName: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};

// Profile first, matching the reference screenshot's ordering (see
// openspec/specs/profile-settings/spec.md).
const SETTINGS_LINKS = [
  { href: "/dashboard/settings/profile", labelKey: "profile" },
  { href: "/dashboard/settings/security", labelKey: "security" },
  { href: "/dashboard/settings/billing", labelKey: "billing" },
] as const;

/**
 * The dashboard's whole navigation chrome. components/ui/sidebar.tsx renders this same tree
 * as either a fixed desktop panel or a mobile slide-out sheet — one component, not the old
 * dashboard-nav.tsx/mobile-nav.tsx pair, so the two presentations can no longer drift apart.
 */
export function AppSidebar({ email, appName, displayName, avatarUrl }: AppSidebarProps) {
  const t = useTranslations("Dashboard.nav");
  const tSettings = useTranslations("Settings.nav");
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  const isDashboardActive = pathname === "/dashboard";
  const isSettingsSection = SETTINGS_LINKS.some((link) => pathname.startsWith(link.href));
  const [settingsOpen, setSettingsOpen] = useState(isSettingsSection);
  // Re-derive from the current path on every render rather than trusting stale local state —
  // that way arriving at a settings page any way other than clicking the toggle (a bookmark,
  // browser back/forward) still shows the group expanded around the active page.
  const settingsExpanded = settingsOpen || isSettingsSection;

  // No-op on desktop (nothing reads `openMobile` there) — closes the mobile overlay once a
  // link is actually chosen, same "closes on selection" contract the old mobile-nav.tsx had.
  function closeMobileNav() {
    setOpenMobile(false);
  }

  return (
    <Sidebar collapsible="icon" mobileTitle={appName}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              {/* min-w-0 + truncate: a long product name (set in /setup) elides instead of
                  wrapping or overflowing the sidebar's fixed width. */}
              <Link href="/dashboard" className="min-w-0" onClick={closeMobileNav}>
                <span className="bg-sidebar-primary text-sidebar-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold">
                  {appName.charAt(0)}
                </span>
                <span className="truncate text-base font-semibold tracking-tight">{appName}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <nav aria-label={t("navLabel")}>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isDashboardActive} tooltip={t("home")}>
                    <Link
                      href="/dashboard"
                      aria-current={isDashboardActive ? "page" : undefined}
                      onClick={closeMobileNav}
                    >
                      <LayoutDashboardIcon />
                      <span>{t("home")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    type="button"
                    aria-expanded={settingsExpanded}
                    tooltip={t("settings")}
                    onClick={() => setSettingsOpen((value) => !value)}
                  >
                    <SettingsIcon />
                    <span>{t("settings")}</span>
                    <ChevronRightIcon
                      className={cn(
                        "ml-auto transition-transform",
                        settingsExpanded && "rotate-90",
                      )}
                    />
                  </SidebarMenuButton>
                  {settingsExpanded && (
                    <SidebarMenuSub>
                      {SETTINGS_LINKS.map((link) => {
                        const isActive = pathname === link.href;
                        return (
                          <SidebarMenuSubItem key={link.href}>
                            <SidebarMenuSubButton asChild isActive={isActive}>
                              <Link
                                href={link.href}
                                aria-current={isActive ? "page" : undefined}
                                onClick={closeMobileNav}
                              >
                                {tSettings(link.labelKey)}
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <UserMenu email={email} displayName={displayName} avatarUrl={avatarUrl} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
