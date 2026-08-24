// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import { UserMenu } from "./user-menu";

// Radix's popper positioning (used by DropdownMenuContent) reads ResizeObserver and pointer
// capture APIs that jsdom doesn't implement — stub them so opening the menu doesn't throw.
// `window.matchMedia` is also missing in jsdom; UserMenu now renders inside SidebarProvider
// (see the file's own doc comment for why), which reads it on every render.
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
  window.matchMedia = vi.fn<(query: string) => MediaQueryList>(
    (query) =>
      ({
        matches: false,
        media: query,
        addEventListener: vi.fn<() => void>(),
        removeEventListener: vi.fn<() => void>(),
      }) as unknown as MediaQueryList,
  );
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

function renderUserMenu(email: string) {
  return render(
    <SidebarProvider>
      <UserMenu email={email} />
    </SidebarProvider>,
  );
}

describe("UserMenu", () => {
  beforeEach(() => {
    signOutMock.mockClear();
  });

  it("opens to show the email and a sign-out action", async () => {
    const user = userEvent.setup();
    renderUserMenu("jane@example.com");

    // The trigger row itself already shows the email at a glance (see user-menu.tsx) — this
    // checks that the *opened dropdown* also shows it, so scope to the menu rather than
    // asserting on page text generally (which would now match both places).
    await user.click(screen.getByRole("button", { name: "accountMenu" }));
    const menu = await screen.findByRole("menu");

    expect(within(menu).getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "signOut" })).toBeInTheDocument();
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it("calls the signOut action when the sign-out item is selected", async () => {
    const user = userEvent.setup();
    renderUserMenu("jane@example.com");

    await user.click(screen.getByRole("button", { name: "accountMenu" }));
    await user.click(screen.getByRole("menuitem", { name: "signOut" }));

    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it("shows initials from the display name when one is set, not the email", () => {
    render(<UserMenu email="jane@example.com" displayName="Ada Lovelace" />);

    expect(screen.getByText("AL")).toBeInTheDocument();
  });
});
