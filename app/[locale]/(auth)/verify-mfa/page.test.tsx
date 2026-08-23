// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const pushMock = vi.fn<(href: string) => void>();
const replaceMock = vi.fn<(href: string) => void>();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const verifyMfaCode = vi.fn<(...args: unknown[]) => Promise<unknown>>();
const resendMfaCode = vi.fn<(...args: unknown[]) => Promise<unknown>>();
vi.mock("@/lib/actions/auth/verify-mfa", () => ({
  verifyMfaCode: (...args: unknown[]) => verifyMfaCode(...args),
  resendMfaCode: (...args: unknown[]) => resendMfaCode(...args),
}));

import VerifyMfaPage from "./page";

beforeEach(() => {
  verifyMfaCode.mockReset();
  resendMfaCode.mockReset();
  pushMock.mockReset();
  replaceMock.mockReset();
});

describe("VerifyMfaPage", () => {
  it("renders the title and the 6-digit code field", () => {
    render(<VerifyMfaPage />);

    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByLabelText("codeLabel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "submit" })).toBeInTheDocument();
  });

  it("shows an inline error and does not navigate when the code is wrong", async () => {
    verifyMfaCode.mockResolvedValueOnce({ success: false, error: "INVALID_CODE" });
    render(<VerifyMfaPage />);

    fireEvent.change(screen.getByLabelText("codeLabel"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() => expect(verifyMfaCode).toHaveBeenCalledWith({ code: "123456" }));
    expect(await screen.findByText("invalidCode")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
