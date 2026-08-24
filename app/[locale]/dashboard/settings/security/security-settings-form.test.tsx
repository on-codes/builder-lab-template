// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ActionResult } from "@/lib/actions/result";
import { disableMfa, enableMfa } from "@/lib/actions/auth/mfa-toggle";
import type { SessionSummary } from "@/lib/auth/session";
import { SecuritySettingsForm } from "./security-settings-form";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// SecuritySettingsForm renders a real next-intl useRouter() (via @/i18n/navigation) on every
// render for the self-revoke redirect path — outside a mounted Next.js App Router it throws
// immediately just from being called, so it needs a stub even in tests that never trigger it.
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn<(href: string) => void>() }),
}));

vi.mock("@/lib/actions/auth/mfa-toggle", () => ({
  enableMfa: vi.fn<() => Promise<ActionResult<undefined, "UNAUTHORIZED" | "UNKNOWN">>>(),
  disableMfa: vi.fn<() => Promise<ActionResult<undefined, "UNAUTHORIZED" | "UNKNOWN">>>(),
}));

vi.mock("@/lib/actions/auth/sessions", () => ({
  revokeSession:
    vi.fn<() => Promise<ActionResult<{ signedOutCurrentDevice: boolean }, "UNAUTHORIZED">>>(),
}));

const NO_SESSIONS: SessionSummary[] = [];

const sessions: SessionSummary[] = [
  {
    id: "session-1",
    userAgent: "Chrome on macOS",
    createdAt: "2026-08-20T10:00:00.000Z",
    lastSeenAt: "2026-08-23T10:00:00.000Z",
    isCurrent: true,
  },
  {
    id: "session-2",
    userAgent: "Safari on iOS",
    createdAt: "2026-08-19T10:00:00.000Z",
    lastSeenAt: "2026-08-22T10:00:00.000Z",
    isCurrent: false,
  },
];

describe("SecuritySettingsForm", () => {
  it("renders the sessions list from initial data", () => {
    render(<SecuritySettingsForm initialMfaEnabled={false} initialSessions={sessions} />);

    expect(screen.getByText("Chrome on macOS")).toBeInTheDocument();
    expect(screen.getByText("Safari on iOS")).toBeInTheDocument();
    // Only the first (current) session gets the "this device" badge.
    expect(screen.getAllByText("sessionCurrent")).toHaveLength(1);
  });

  it("calls enableMfa when the MFA switch is turned on", async () => {
    vi.mocked(enableMfa).mockResolvedValue({ success: true, data: undefined });
    const user = userEvent.setup();

    render(<SecuritySettingsForm initialMfaEnabled={false} initialSessions={NO_SESSIONS} />);

    await user.click(screen.getByRole("switch"));

    expect(enableMfa).toHaveBeenCalledTimes(1);
    expect(disableMfa).not.toHaveBeenCalled();
  });
});
