import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";
import PaymentFailedEmail, { subject } from "./payment-failed";

describe("PaymentFailedEmail", () => {
  it("includes the billing portal link", async () => {
    const html = await render(
      await PaymentFailedEmail({
        billingPortalUrl: "https://example.com/dashboard/settings/billing",
        locale: "en",
      }),
    );

    expect(html).toContain("https://example.com/dashboard/settings/billing");
    expect(html).toMatch(/update your payment method/i);
  });

  it("has a non-empty subject", async () => {
    expect(await subject({ locale: "en" })).toBeTruthy();
  });
});
