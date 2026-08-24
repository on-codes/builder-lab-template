// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { LogInData, LogInError } from "@/lib/actions/auth/log-in";
import type { ActionResult } from "@/lib/actions/result";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const pushMock = vi.fn<(href: string) => void>();
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: pushMock, replace: vi.fn<(href: string) => void>() }),
}));

vi.mock("@/lib/actions/auth/log-in", () => ({
  logIn:
    vi.fn<
      (input: { email: string; password: string }) => Promise<ActionResult<LogInData, LogInError>>
    >(),
}));

import { logIn } from "@/lib/actions/auth/log-in";
import { LoginForm } from "./login-form";

describe("LoginForm", () => {
  it("renders email and password fields", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText("emailLabel")).toBeInTheDocument();
    expect(screen.getByLabelText("passwordLabel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "submit" })).toBeInTheDocument();
  });

  it("shows the generic invalid-credentials message inline when login fails", async () => {
    vi.mocked(logIn).mockResolvedValueOnce({ success: false, error: "INVALID_CREDENTIALS" });
    const user = userEvent.setup();

    render(<LoginForm />);

    await user.type(screen.getByLabelText("emailLabel"), "test@example.com");
    await user.type(screen.getByLabelText("passwordLabel"), "whatever-password");
    await user.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() => {
      expect(screen.getByText("invalidCredentials")).toBeInTheDocument();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });
});
