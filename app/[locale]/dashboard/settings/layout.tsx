import type * as React from "react";
import { SettingsNav } from "./settings-nav";

/**
 * Shared shell for every /dashboard/settings/* screen — the tab strip plus the one shared
 * max-width/padding wrapper, so every settings screen's form component renders its own content
 * only (no per-page centering/padding of its own) and the nav lines up with it exactly.
 */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6 md:p-10">
      <SettingsNav />
      {children}
    </div>
  );
}
