import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";
import ResetPasswordEmail, { subject } from "./reset-password";

describe("ResetPasswordEmail", () => {
  it("includes the reset link and expiry", async () => {
    const html = await render(
      await ResetPasswordEmail({
        resetUrl: "https://example.com/reset-password?token=abc123",
        expiresInMinutes: 30,
        locale: "en",
      }),
    );

    expect(html).toContain("https://example.com/reset-password?token=abc123");
    expect(html).toMatch(/30/);
  });

  it("has a non-empty subject", async () => {
    expect(await subject({ locale: "en" })).toBeTruthy();
  });
});
