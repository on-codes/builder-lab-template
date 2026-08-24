// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SignUpError } from "@/lib/actions/auth/sign-up";
import type { ActionResult } from "@/lib/actions/result";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({
    push: vi.fn<(href: string) => void>(),
    replace: vi.fn<(href: string) => void>(),
  }),
}));

vi.mock("@/lib/actions/auth/sign-up", () => ({
  signUp:
    vi.fn<
      (input: {
        email: string;
        password: string;
      }) => Promise<ActionResult<{ email: string }, SignUpError>>
    >(),
}));

import { signUp } from "@/lib/actions/auth/sign-up";
import { SignupForm } from "./signup-form";

describe("SignupForm", () => {
  it("renders email, password, and confirm-password fields", () => {
    render(<SignupForm />);

    expect(screen.getByLabelText("emailLabel")).toBeInTheDocument();
    expect(screen.getByLabelText("passwordLabel")).toBeInTheDocument();
    expect(screen.getByLabelText("confirmPasswordLabel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "submit" })).toBeInTheDocument();
  });

  it("shows the breached-password reason inline when the action rejects it", async () => {
    vi.mocked(signUp).mockResolvedValueOnce({ success: false, error: "PASSWORD_BREACHED" });
    const user = userEvent.setup();

    render(<SignupForm />);

    await user.type(screen.getByLabelText("emailLabel"), "test@example.com");
    await user.type(screen.getByLabelText("passwordLabel"), "correct-horse-battery");
    await user.type(screen.getByLabelText("confirmPasswordLabel"), "correct-horse-battery");
    await user.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() => {
      expect(screen.getByText("passwordBreached")).toBeInTheDocument();
    });
    expect(signUp).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "correct-horse-battery",
    });
  });
});
