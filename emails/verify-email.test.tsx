import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";
import VerifyEmail, { subject } from "./verify-email";

describe("VerifyEmail", () => {
  it("includes the verification link and expiry", async () => {
    const html = await render(
      await VerifyEmail({
        verifyUrl: "https://example.com/auth/verify?token=abc123",
        expiresInHours: 24,
        locale: "en",
      }),
    );

    expect(html).toContain("https://example.com/auth/verify?token=abc123");
    expect(html).toMatch(/24/);
  });

  it("has a non-empty subject", async () => {
    expect(await subject({ locale: "en" })).toBeTruthy();
  });
});
