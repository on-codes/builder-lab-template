// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserMenu } from "./user-menu";

// Radix's popper positioning (used by DropdownMenuContent) reads ResizeObserver and pointer
// capture APIs that jsdom doesn't implement — stub them so opening the menu doesn't throw.
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

// The real Link is locale-aware and expects Next.js's app router context, which isn't
// mounted under plain Testing Library — swap in a plain anchor, same as any other UI dep.
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
}));

const signOutMock = vi.fn<() => Promise<void>>(async () => {});
vi.mock("@/lib/actions/auth/sign-out", () => ({
  signOut: () => signOutMock(),
}));

describe("UserMenu", () => {
  beforeEach(() => {
    signOutMock.mockClear();
  });

  it("opens to show the email, a Settings link, and a sign-out action", async () => {
    const user = userEvent.setup();
    render(<UserMenu email="jane@example.com" />);

    await user.click(screen.getByRole("button", { name: "accountMenu" }));

    expect(await screen.findByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "settings" })).toHaveAttribute(
      "href",
      "/dashboard/settings/security",
    );
    expect(screen.getByRole("menuitem", { name: "signOut" })).toBeInTheDocument();
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it("calls the signOut action when the sign-out item is selected", async () => {
    const user = userEvent.setup();
    render(<UserMenu email="jane@example.com" />);

    await user.click(screen.getByRole("button", { name: "accountMenu" }));
    await user.click(screen.getByRole("menuitem", { name: "signOut" }));

    expect(signOutMock).toHaveBeenCalledTimes(1);
  });
});
