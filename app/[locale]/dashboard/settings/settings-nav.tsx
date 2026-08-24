"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Only tabs with a real page behind them. Profile first, matching the reference screenshot's
// ordering (see openspec/changes/add-profile-settings).
const TABS = [
  { href: "/dashboard/settings/profile", labelKey: "profile" },
  { href: "/dashboard/settings/security", labelKey: "security" },
  { href: "/dashboard/settings/billing", labelKey: "billing" },
] as const;

export function SettingsNav() {
  const t = useTranslations("Settings.nav");
  const pathname = usePathname();

  return (
    // overflow-x-auto is a safety net, not a fix for a problem visible today with 2 short
    // tabs — it's here so a narrow phone screen or a longer future translation/extra tab
    // degrades to a horizontal scroll instead of wrapping awkwardly or overflowing the page.
    // flex-nowrap + shrink-0/whitespace-nowrap on each tab keep every label on one line so
    // the strip scrolls as a unit rather than individual tabs wrapping internally.
    <nav aria-label={t("navLabel")} className="flex flex-nowrap gap-4 overflow-x-auto border-b">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-2 px-1 pb-3 text-sm font-medium whitespace-nowrap transition-colors",
              isActive
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t(tab.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
