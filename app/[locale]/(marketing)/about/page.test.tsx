// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));

import AboutPage from "./page";

describe("AboutPage", () => {
  it("renders the about heading and body copy", async () => {
    const ui = await AboutPage();
    render(ui);

    expect(screen.getByRole("heading", { name: "title" })).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
  });
});
