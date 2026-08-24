import { afterEach, describe, expect, it, vi } from "vitest";
import { getPriceId, isPlanId, listPlans, planIdForPriceId } from "./plans";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isPlanId", () => {
  it("accepts known plan ids", () => {
    expect(isPlanId("pro")).toBe(true);
    expect(isPlanId("business")).toBe(true);
  });

  it("rejects an unknown plan id", () => {
    expect(isPlanId("enterprise")).toBe(false);
    expect(isPlanId("")).toBe(false);
  });
});

describe("getPriceId", () => {
  it("returns the configured Price ID for a known plan", () => {
    expect(getPriceId("pro")).toBe("price_test_pro");
    expect(getPriceId("business")).toBe("price_test_business");
  });

  it("throws when the env var for that plan isn't configured", async () => {
    // PLANS reads process.env at module-evaluation time, so a later vi.stubEnv() can't change
    // the already-imported module's captured value — reset the module registry and re-import
    // to get a fresh evaluation with the stubbed env in place.
    vi.resetModules();
    vi.stubEnv("STRIPE_PRICE_ID_PRO", "");
    const freshPlans = await import("./plans");

    expect(() => freshPlans.getPriceId("pro")).toThrow(/Missing Stripe Price ID/);
  });
});

describe("planIdForPriceId", () => {
  it("resolves a known Price ID back to its plan id", () => {
    expect(planIdForPriceId("price_test_pro")).toBe("pro");
    expect(planIdForPriceId("price_test_business")).toBe("business");
  });

  it("returns null for a Price ID that isn't configured for any plan", () => {
    expect(planIdForPriceId("price_does_not_exist")).toBeNull();
  });
});

describe("listPlans", () => {
  it("lists every plan with just an id and a name — never the Stripe Price ID", () => {
    const plans = listPlans();

    expect(plans).toEqual([
      { id: "pro", name: "Pro" },
      { id: "business", name: "Business" },
    ]);
    for (const plan of plans) {
      expect(plan).not.toHaveProperty("priceId");
    }
  });
});
