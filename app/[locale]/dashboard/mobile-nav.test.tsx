// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MobileNav } from "./mobile-nav";

// Radix's popper/portal positioning reads ResizeObserver and pointer capture APIs jsdom
// doesn't implement — same stubs as user-menu.test.tsx.
beforeEach(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const mockUsePathname = vi.fn<() => string>(() => "/dashboard");
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

describe("MobileNav", () => {
  it("opens the menu and shows both nav links", async () => {
    const user = userEvent.setup();
    render(<MobileNav />);

    await user.click(screen.getByRole("button", { name: "openMenu" }));

    expect(await screen.findByRole("link", { name: "home" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "settings" })).toBeInTheDocument();
  });

  it("closes the menu when a link is clicked", async () => {
    const user = userEvent.setup();
    render(<MobileNav />);

    await user.click(screen.getByRole("button", { name: "openMenu" }));
    await user.click(await screen.findByRole("link", { name: "home" }));

    expect(screen.queryByRole("link", { name: "home" })).not.toBeInTheDocument();
  });
});
