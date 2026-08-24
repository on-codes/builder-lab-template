// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

// Radix's popper/portal positioning (the DropdownMenu in UserMenu, the Tooltip on collapsed
// nav buttons) reads ResizeObserver and pointer capture APIs jsdom doesn't implement — same
// stubs as user-menu.test.tsx. `window.matchMedia` is also missing in jsdom; the sidebar's
// mobile/desktop switch (hooks/use-mobile.ts) reads it on every render, so every test needs a
// stub even the ones that don't care about the mobile viewport specifically.
let mockMatchesMobile = false;

beforeEach(() => {
  mockMatchesMobile = false;
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
  window.matchMedia = vi.fn<(query: string) => MediaQueryList>(
    (query) =>
      ({
        matches: mockMatchesMobile,
        media: query,
        addEventListener: vi.fn<() => void>(),
        removeEventListener: vi.fn<() => void>(),
      }) as unknown as MediaQueryList,
  );
});

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

vi.mock("@/lib/actions/auth/sign-out", () => ({
  signOut: vi.fn<() => Promise<void>>(async () => {}),
}));

function renderSidebar(extra?: React.ReactNode) {
  return render(
    <SidebarProvider>
      {extra}
      <AppSidebar email="jane@example.com" appName="BuilderLab" />
    </SidebarProvider>,
  );
}

describe("AppSidebar", () => {
  it("marks the Dashboard link current on the dashboard home", () => {
    mockUsePathname.mockReturnValue("/dashboard");
    renderSidebar();

    expect(screen.getByRole("link", { name: "home" })).toHaveAttribute("aria-current", "page");
  });

  it("collapses the Settings group by default outside /dashboard/settings/*", () => {
    mockUsePathname.mockReturnValue("/dashboard");
    renderSidebar();

    expect(screen.getByRole("button", { name: "settings" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByRole("link", { name: "security" })).not.toBeInTheDocument();
  });

  it("auto-expands Settings and marks the matching sub-link current on a settings sub-page", () => {
    mockUsePathname.mockReturnValue("/dashboard/settings/billing");
    renderSidebar();

    expect(screen.getByRole("button", { name: "settings" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("link", { name: "billing" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "security" })).not.toHaveAttribute("aria-current");
  });

  it("shows Profile first, then Security, then Billing in the expanded Settings group", () => {
    mockUsePathname.mockReturnValue("/dashboard/settings/profile");
    renderSidebar();

    const settingsLinks = ["profile", "security", "billing"].map((name) =>
      screen.getByRole("link", { name }),
    );
    expect(settingsLinks.map((link) => link.getAttribute("href"))).toEqual([
      "/dashboard/settings/profile",
      "/dashboard/settings/security",
      "/dashboard/settings/billing",
    ]);
    expect(settingsLinks[0]).toHaveAttribute("aria-current", "page");
  });

  it("toggles the Settings group open and closed on click", async () => {
    const user = userEvent.setup();
    mockUsePathname.mockReturnValue("/dashboard");
    renderSidebar();

    await user.click(screen.getByRole("button", { name: "settings" }));
    expect(screen.getByRole("link", { name: "security" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "settings" }));
    expect(screen.queryByRole("link", { name: "security" })).not.toBeInTheDocument();
  });

  it("on a mobile viewport, the trigger opens the same links and closes on selection", async () => {
    mockMatchesMobile = true;
    mockUsePathname.mockReturnValue("/dashboard");
    const user = userEvent.setup();
    renderSidebar(<SidebarTrigger aria-label="toggleSidebar" />);

    expect(screen.queryByRole("link", { name: "home" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "toggleSidebar" }));
    expect(await screen.findByRole("link", { name: "home" })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "home" }));
    expect(screen.queryByRole("link", { name: "home" })).not.toBeInTheDocument();
  });
});
