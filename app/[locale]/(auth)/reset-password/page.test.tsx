// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const replaceMock = vi.fn<(href: string) => void>();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn<(href: string) => void>(), replace: replaceMock }),
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const validateNewPasswordForReset = vi.fn<(...args: unknown[]) => Promise<unknown>>();
vi.mock("@/lib/actions/auth/password-reset", () => ({
  validateNewPasswordForReset: (...args: unknown[]) => validateNewPasswordForReset(...args),
}));

const setSession = vi.fn<(...args: unknown[]) => Promise<unknown>>();
const updateUser = vi.fn<(...args: unknown[]) => Promise<unknown>>();
const signOut = vi.fn<(...args: unknown[]) => Promise<unknown>>();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      setSession: (...args: unknown[]) => setSession(...args),
      updateUser: (...args: unknown[]) => updateUser(...args),
      signOut: (...args: unknown[]) => signOut(...args),
    },
  }),
}));

import ResetPasswordPage from "./page";

beforeEach(() => {
  validateNewPasswordForReset.mockReset();
  setSession.mockReset();
  updateUser.mockReset();
  signOut.mockReset();
  window.location.hash = "";
});

describe("ResetPasswordPage", () => {
  it("shows the invalid-link message when the URL has no recovery tokens", async () => {
    render(<ResetPasswordPage />);

    expect(await screen.findByText("invalidLink")).toBeInTheDocument();
    expect(screen.getByText("requestNewLink")).toBeInTheDocument();
    expect(setSession).not.toHaveBeenCalled();
  });

  it("shows the server-side password error returned by validateNewPasswordForReset", async () => {
    window.location.hash = "access_token=token-abc&refresh_token=token-def&type=recovery";
    setSession.mockResolvedValueOnce({ data: {}, error: null });
    validateNewPasswordForReset.mockResolvedValueOnce({
      success: false,
      error: "PASSWORD_TOO_WEAK",
    });

    render(<ResetPasswordPage />);

    expect(await screen.findByLabelText("passwordLabel")).toBeInTheDocument();
    expect(setSession).toHaveBeenCalledWith({
      access_token: "token-abc",
      refresh_token: "token-def",
    });

    fireEvent.change(screen.getByLabelText("passwordLabel"), {
      target: { value: "correct-horse-battery" },
    });
    fireEvent.change(screen.getByLabelText("confirmPasswordLabel"), {
      target: { value: "correct-horse-battery" },
    });
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    expect(await screen.findByText("passwordTooWeak")).toBeInTheDocument();
    expect(updateUser).not.toHaveBeenCalled();
  });
});
