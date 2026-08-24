import type * as React from "react";

/**
 * Shared shell for every /dashboard/settings/* screen — just the one shared max-width/padding
 * wrapper, so every settings screen's form component renders its own content only (no
 * per-page centering/padding of its own). Security/Billing are reachable and marked current
 * from the sidebar's own "Settings" group (see app-sidebar.tsx) — no separate tab strip here
 * anymore, that would just repeat the same two links a second time.
 */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6 md:p-10">{children}</div>;
}
