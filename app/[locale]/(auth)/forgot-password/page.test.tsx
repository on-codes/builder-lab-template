// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const requestPasswordReset = vi.fn<(...args: unknown[]) => Promise<unknown>>();
vi.mock("@/lib/actions/auth/password-reset", () => ({
  requestPasswordReset: (...args: unknown[]) => requestPasswordReset(...args),
}));

import ForgotPasswordPage from "./page";

beforeEach(() => {
  requestPasswordReset.mockReset();
});

describe("ForgotPasswordPage", () => {
  it("renders the email field and submit button", () => {
    render(<ForgotPasswordPage />);

    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByLabelText("emailLabel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "submit" })).toBeInTheDocument();
  });

  it("shows the same checkEmail message even when the action reports failure (enumeration-safe)", async () => {
    requestPasswordReset.mockResolvedValueOnce({ success: false, error: "UNKNOWN" });
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText("emailLabel"), {
      target: { value: "person@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    expect(await screen.findByText("checkEmail")).toBeInTheDocument();
  });
});
