// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));

import TermsPage from "./page";

const SECTION_KEYS = [
  "acceptance",
  "useOfService",
  "subscriptions",
  "termination",
  "liability",
  "changes",
  "contact",
];

describe("TermsPage", () => {
  it("renders the placeholder-legal-text notice and every section", async () => {
    const ui = await TermsPage();
    render(ui);

    // The "not legal advice" notice is required and must come from the message catalog.
    expect(screen.getByText("notice.title")).toBeInTheDocument();
    expect(screen.getByText("notice.body")).toBeInTheDocument();

    for (const key of SECTION_KEYS) {
      expect(screen.getByText(`sections.${key}.title`)).toBeInTheDocument();
      expect(screen.getByText(`sections.${key}.body`)).toBeInTheDocument();
    }
  });
});
