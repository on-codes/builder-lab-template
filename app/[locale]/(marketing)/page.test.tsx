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

import MarketingHomePage from "./page";

describe("MarketingHomePage", () => {
  it("renders the hero headline, subheadline, and a CTA linking to /signup", async () => {
    const ui = await MarketingHomePage();
    render(ui);

    expect(screen.getByRole("heading", { level: 1, name: "heroTitle" })).toBeInTheDocument();
    expect(screen.getByText("heroSubtitle")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "heroCta" })).toHaveAttribute("href", "/signup");
  });

  it("lists all four feature bullets (auth, billing, dashboard, i18n)", async () => {
    const ui = await MarketingHomePage();
    render(ui);

    for (const key of ["auth", "billing", "dashboard", "i18n"]) {
      expect(screen.getByText(`features.${key}.title`)).toBeInTheDocument();
      expect(screen.getByText(`features.${key}.description`)).toBeInTheDocument();
    }
  });
});
