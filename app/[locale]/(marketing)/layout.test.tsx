// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));

// The real Link is locale-aware and expects Next.js's app router context, which isn't mounted
// under plain Testing Library — swap in a plain anchor, same as other component tests.
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import MarketingLayout from "./layout";

describe("MarketingLayout", () => {
  it("renders the product name, nav links, auth links, children, and footer legal links", async () => {
    const ui = await MarketingLayout({ children: <div>page content</div> });
    render(ui);

    expect(screen.getByRole("link", { name: "appName" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "pricing" })).toHaveAttribute("href", "/pricing");
    expect(screen.getByRole("link", { name: "about" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: "logIn" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "signUp" })).toHaveAttribute("href", "/signup");

    expect(screen.getByText("page content")).toBeInTheDocument();

    expect(screen.getByText("copyright")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "terms" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "privacy" })).toHaveAttribute("href", "/privacy");
  });
});
