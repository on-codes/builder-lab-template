"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Only tabs with a real page behind them — there's no Settings.nav.profile screen yet, so it
// stays out of this list rather than linking somewhere that 404s.
const TABS = [
  { href: "/dashboard/settings/security", labelKey: "security" },
  { href: "/dashboard/settings/billing", labelKey: "billing" },
] as const;

export function SettingsNav() {
  const t = useTranslations("Settings.nav");
  const pathname = usePathname();

  return (
    <nav aria-label={t("navLabel")} className="flex gap-4 border-b">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "border-b-2 px-1 pb-3 text-sm font-medium transition-colors",
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
