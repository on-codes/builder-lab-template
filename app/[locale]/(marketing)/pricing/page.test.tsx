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

import PricingPage from "./page";

describe("PricingPage", () => {
  it("renders a card per plan from listPlans(), each CTA linking to /signup", async () => {
    const ui = await PricingPage();
    render(ui);

    // Real plan names from lib/stripe/plans.ts — never a hardcoded dollar amount.
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("Business")).toBeInTheDocument();
    expect(screen.getAllByText("priceholder")).toHaveLength(2);

    const ctaLinks = screen.getAllByRole("link", { name: "cta" });
    expect(ctaLinks).toHaveLength(2);
    for (const link of ctaLinks) {
      expect(link).toHaveAttribute("href", "/signup");
    }
  });
});
