import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";
import ConfirmEmailChangeEmail, { subject } from "./confirm-email-change";

describe("ConfirmEmailChangeEmail", () => {
  it("includes the confirmation link, the new address, and the expiry", async () => {
    const html = await render(
      await ConfirmEmailChangeEmail({
        confirmUrl: "https://example.com/auth/verify?token=abc123",
        newEmail: "new@example.com",
        expiresInHours: 24,
        locale: "en",
      }),
    );

    expect(html).toContain("https://example.com/auth/verify?token=abc123");
    expect(html).toContain("new@example.com");
    expect(html).toMatch(/24/);
    // React Email renders the apostrophe as an HTML entity (&#x27;), not a literal ', so this
    // checks the surrounding words rather than the contraction itself.
    expect(html).toMatch(/safely ignore this email/i);
  });

  it("has a non-empty subject", async () => {
    expect(await subject({ locale: "en" })).toBeTruthy();
  });
});
