// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));

// The real Link is locale-aware and expects Next.js's app router context, which isn't mounted
// under plain Testing Library — swap in a plain anchor, same as other layout/page tests.
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { AuthShowcase } from "./auth-showcase";

describe("AuthShowcase", () => {
  it("renders the brand link, the marketing hero copy, and all four feature highlights", async () => {
    const ui = await AuthShowcase();
    render(ui);

    expect(screen.getByRole("link", { name: "appName" })).toHaveAttribute("href", "/");
    expect(screen.getByText("heroTitle")).toBeInTheDocument();
    expect(screen.getByText("heroSubtitle")).toBeInTheDocument();

    for (const key of ["auth", "billing", "dashboard", "i18n"]) {
      expect(screen.getByText(`features.${key}.title`)).toBeInTheDocument();
    }
  });
});
