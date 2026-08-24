// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import type * as React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));

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

import DashboardNotFound from "./not-found";

describe("DashboardNotFound", () => {
  it("shows a friendly message with a link back to the dashboard", async () => {
    const ui = await DashboardNotFound();
    render(ui);

    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "goToDashboardAction" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });
});
