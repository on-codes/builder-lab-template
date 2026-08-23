import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";
import MfaCodeEmail, { subject } from "./mfa-code";

describe("MfaCodeEmail", () => {
  it("includes the code and the expiry", async () => {
    const html = await render(
      await MfaCodeEmail({ code: "482913", expiresInMinutes: 10, locale: "en" }),
    );

    expect(html).toContain("482913");
    expect(html).toMatch(/10/);
    expect(html).toMatch(/someone may have your password/i);
  });

  it("has a non-empty subject", async () => {
    expect(await subject({ locale: "en" })).toBeTruthy();
  });
});
