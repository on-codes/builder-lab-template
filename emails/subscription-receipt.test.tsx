import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";
import SubscriptionReceiptEmail, { subject } from "./subscription-receipt";

describe("SubscriptionReceiptEmail", () => {
  it("includes the formatted amount and the invoice link", async () => {
    const html = await render(
      await SubscriptionReceiptEmail({
        amount: 2500,
        currency: "usd",
        invoiceUrl: "https://example.com/invoice/123",
        locale: "en",
      }),
    );

    expect(html).toContain("$25.00");
    expect(html).toContain("https://example.com/invoice/123");
  });

  it("omits the invoice button when no invoiceUrl is given", async () => {
    const html = await render(
      await SubscriptionReceiptEmail({ amount: 2500, currency: "usd", locale: "en" }),
    );

    expect(html).not.toMatch(/view invoice/i);
  });

  it("has a non-empty subject", async () => {
    expect(await subject({ locale: "en" })).toBeTruthy();
  });
});
