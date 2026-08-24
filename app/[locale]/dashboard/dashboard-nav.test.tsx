// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import type * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { DashboardNav } from "./dashboard-nav";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const mockUsePathname = vi.fn<() => string>();
vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: { href: string; children: React.ReactNode } & React.ComponentPropsWithoutRef<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePathname: () => mockUsePathname(),
}));

describe("DashboardNav", () => {
  it("marks the Dashboard link current on the dashboard home", () => {
    mockUsePathname.mockReturnValue("/dashboard");
    render(<DashboardNav />);

    expect(screen.getByRole("link", { name: "home" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "settings" })).not.toHaveAttribute("aria-current");
  });

  it("marks the Settings link current on any /dashboard/settings/* page", () => {
    mockUsePathname.mockReturnValue("/dashboard/settings/billing");
    render(<DashboardNav />);

    expect(screen.getByRole("link", { name: "settings" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "home" })).not.toHaveAttribute("aria-current");
  });
});
