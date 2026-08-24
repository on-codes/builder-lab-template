// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import type * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { SettingsNav } from "./settings-nav";

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

describe("SettingsNav", () => {
  it("shows Profile first, then Security, then Billing", () => {
    mockUsePathname.mockReturnValue("/dashboard/settings/profile");
    render(<SettingsNav />);

    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/dashboard/settings/profile",
      "/dashboard/settings/security",
      "/dashboard/settings/billing",
    ]);
  });

  it("marks the Profile tab current on the profile screen", () => {
    mockUsePathname.mockReturnValue("/dashboard/settings/profile");
    render(<SettingsNav />);

    expect(screen.getByRole("link", { name: "profile" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "security" })).not.toHaveAttribute("aria-current");
  });
});
