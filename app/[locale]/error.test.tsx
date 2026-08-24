// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as React from "react";
import { describe, expect, it, vi } from "vitest";
import ErrorPage from "./error";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
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

describe("ErrorPage", () => {
  it("shows a friendly message, never the raw error, and calls reset when retrying", async () => {
    const reset = vi.fn<() => void>();
    const user = userEvent.setup();
    render(<ErrorPage error={new Error("raw internal detail")} reset={reset} />);

    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.queryByText(/raw internal detail/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "retryAction" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("links home", () => {
    render(<ErrorPage error={new Error("boom")} reset={() => {}} />);
    expect(screen.getByRole("link", { name: "homeAction" })).toHaveAttribute("href", "/");
  });
});
