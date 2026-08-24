// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionResult } from "@/lib/actions/result";
import { removeAvatar, uploadAvatar } from "@/lib/actions/profile/avatar";
import { requestEmailChange } from "@/lib/actions/profile/change-email";
import { updateDisplayName } from "@/lib/actions/profile/update-profile";
import { ProfileSettingsForm } from "./profile-settings-form";

// Radix's popper positioning (used by DialogContent) reads ResizeObserver and pointer capture
// APIs that jsdom doesn't implement — stub them so opening the dialog doesn't throw. Same setup
// as app/[locale]/dashboard/user-menu.test.tsx for its DropdownMenu.
beforeEach(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/actions/profile/update-profile", () => ({
  updateDisplayName:
    vi.fn<
      () => Promise<
        ActionResult<{ displayName: string }, "INVALID_INPUT" | "UNAUTHORIZED" | "UNKNOWN">
      >
    >(),
}));

vi.mock("@/lib/actions/profile/avatar", () => ({
  uploadAvatar: vi.fn<() => Promise<ActionResult<{ avatarUrl: string }, string>>>(),
  removeAvatar: vi.fn<() => Promise<ActionResult<undefined, string>>>(),
}));

vi.mock("@/lib/actions/profile/change-email", () => ({
  requestEmailChange: vi.fn<() => Promise<ActionResult<undefined, string>>>(),
}));

describe("ProfileSettingsForm", () => {
  beforeEach(() => {
    vi.mocked(updateDisplayName).mockReset();
    vi.mocked(uploadAvatar).mockReset();
    vi.mocked(removeAvatar).mockReset();
    vi.mocked(requestEmailChange).mockReset();
  });

  it("renders the current email as read-only and the initial name", () => {
    render(
      <ProfileSettingsForm
        email="jane@example.com"
        initialDisplayName="Ada Lovelace"
        initialAvatarUrl={null}
      />,
    );

    expect(screen.getByDisplayValue("jane@example.com")).toBeDisabled();
    expect(screen.getByDisplayValue("Ada Lovelace")).toBeInTheDocument();
    // No avatar set yet — the fallback initials come from the name, and there's nothing to
    // remove.
    expect(screen.getByText("AL")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "avatarRemoveAction" })).not.toBeInTheDocument();
  });

  it("saves a trimmed display name", async () => {
    vi.mocked(updateDisplayName).mockResolvedValue({
      success: true,
      data: { displayName: "Grace Hopper" },
    });
    const user = userEvent.setup();

    render(
      <ProfileSettingsForm
        email="jane@example.com"
        initialDisplayName="Ada"
        initialAvatarUrl={null}
      />,
    );

    const nameInput = screen.getByDisplayValue("Ada");
    await user.clear(nameInput);
    await user.type(nameInput, "  Grace Hopper  ");
    await user.click(screen.getByRole("button", { name: "save" }));

    expect(updateDisplayName).toHaveBeenCalledWith({ displayName: "Grace Hopper" });
  });

  it("uploads a selected image file", async () => {
    vi.mocked(uploadAvatar).mockResolvedValue({
      success: true,
      data: { avatarUrl: "https://example.com/avatars/user-1/new.png" },
    });
    const user = userEvent.setup();
    const file = new File(["fake-bytes"], "avatar.png", { type: "image/png" });

    render(
      <ProfileSettingsForm
        email="jane@example.com"
        initialDisplayName="Ada"
        initialAvatarUrl={null}
      />,
    );

    await user.upload(screen.getByLabelText("avatarUploadAction"), file);

    expect(uploadAvatar).toHaveBeenCalledTimes(1);
    const formData = vi.mocked(uploadAvatar).mock.calls[0][0];
    expect(formData.get("file")).toBe(file);
  });

  it("removes an existing avatar", async () => {
    vi.mocked(removeAvatar).mockResolvedValue({ success: true, data: undefined });
    const user = userEvent.setup();

    render(
      <ProfileSettingsForm
        email="jane@example.com"
        initialDisplayName="Ada"
        initialAvatarUrl="https://example.com/avatars/user-1/old.png"
      />,
    );

    await user.click(screen.getByRole("button", { name: "avatarRemoveAction" }));

    expect(removeAvatar).toHaveBeenCalledTimes(1);
  });

  it("requests an email change with the new address and current password", async () => {
    vi.mocked(requestEmailChange).mockResolvedValue({ success: true, data: undefined });
    const user = userEvent.setup();

    render(
      <ProfileSettingsForm
        email="jane@example.com"
        initialDisplayName="Ada"
        initialAvatarUrl={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "changeEmailAction" }));
    await user.type(screen.getByLabelText("newEmailLabel"), "new@example.com");
    await user.type(screen.getByLabelText("currentPasswordLabel"), "s3cret-password");
    await user.click(screen.getByRole("button", { name: "changeEmailSubmit" }));

    expect(requestEmailChange).toHaveBeenCalledWith({
      newEmail: "new@example.com",
      currentPassword: "s3cret-password",
    });
    // The dialog closes on success — its fields are no longer reachable.
    expect(screen.queryByLabelText("newEmailLabel")).not.toBeInTheDocument();
  });

  it("shows a field error when the current password is wrong, without closing the dialog", async () => {
    vi.mocked(requestEmailChange).mockResolvedValue({
      success: false,
      error: "INVALID_PASSWORD",
    });
    const user = userEvent.setup();

    render(
      <ProfileSettingsForm
        email="jane@example.com"
        initialDisplayName="Ada"
        initialAvatarUrl={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "changeEmailAction" }));
    await user.type(screen.getByLabelText("newEmailLabel"), "new@example.com");
    await user.type(screen.getByLabelText("currentPasswordLabel"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "changeEmailSubmit" }));

    expect(await screen.findByText("changeEmailErrorInvalidPassword")).toBeInTheDocument();
    expect(screen.getByLabelText("newEmailLabel")).toBeInTheDocument();
  });
});
