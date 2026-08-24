// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// AuthShowcase is itself an async Server Component (see ./auth-showcase.tsx) and has its own
// test — mocked here with a plain sync component so this test can render the resolved layout
// tree with plain react-dom (which can't render an unresolved nested async component), and so
// it stays focused on the shell rather than showcase content.
vi.mock("./auth-showcase", () => ({
  AuthShowcase: () => <div data-testid="auth-showcase" />,
}));

import AuthLayout from "./layout";

describe("AuthLayout", () => {
  it("renders the brand link, the page content, and the showcase panel", async () => {
    const ui = await AuthLayout({ children: <div>form content</div> });
    render(ui);

    expect(screen.getByRole("link", { name: "appName" })).toHaveAttribute("href", "/");
    expect(screen.getByText("form content")).toBeInTheDocument();
    expect(screen.getByTestId("auth-showcase")).toBeInTheDocument();
  });
});
