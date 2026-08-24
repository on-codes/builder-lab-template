// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionResult } from "@/lib/actions/result";
import { createCheckoutSession } from "@/lib/actions/billing/checkout";
import type { CreateCheckoutSessionError } from "@/lib/actions/billing/checkout";
import { createPortalSession } from "@/lib/actions/billing/portal";
import type { CreatePortalSessionError } from "@/lib/actions/billing/portal";
import type { PlanSummary } from "@/lib/stripe/plans";
import { BillingSettingsForm } from "./billing-settings-form";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/actions/billing/checkout", () => ({
  createCheckoutSession:
    vi.fn<
      (input: {
        planId: string;
      }) => Promise<ActionResult<{ url: string }, CreateCheckoutSessionError>>
    >(),
}));

vi.mock("@/lib/actions/billing/portal", () => ({
  createPortalSession:
    vi.fn<() => Promise<ActionResult<{ url: string }, CreatePortalSessionError>>>(),
}));

const plans: PlanSummary[] = [
  { id: "pro", name: "Pro" },
  { id: "business", name: "Business" },
];

describe("BillingSettingsForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the plan picker when there's no subscription yet", () => {
    render(<BillingSettingsForm subscription={null} plans={plans} checkoutResult={null} />);

    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("Business")).toBeInTheDocument();
    expect(screen.getAllByText("subscribeAction")).toHaveLength(2);
  });

  it("shows the current plan and a manage button when subscribed", () => {
    render(
      <BillingSettingsForm
        subscription={{ status: "active", plan: "Pro", current_period_end: null }}
        plans={plans}
        checkoutResult={null}
      />,
    );

    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("status.active")).toBeInTheDocument();
    expect(screen.getByText("manageAction")).toBeInTheDocument();
    expect(screen.queryByText("subscribeAction")).not.toBeInTheDocument();
  });

  it("calls createCheckoutSession with the clicked plan's id", async () => {
    vi.mocked(createCheckoutSession).mockResolvedValue({ success: false, error: "UNKNOWN" });
    const user = userEvent.setup();

    render(<BillingSettingsForm subscription={null} plans={plans} checkoutResult={null} />);
    await user.click(screen.getAllByText("subscribeAction")[1]);

    expect(createCheckoutSession).toHaveBeenCalledTimes(1);
    expect(createCheckoutSession).toHaveBeenCalledWith({ planId: "business" });
    expect(createPortalSession).not.toHaveBeenCalled();
  });

  it("calls createPortalSession when Manage subscription is clicked", async () => {
    vi.mocked(createPortalSession).mockResolvedValue({ success: false, error: "NO_CUSTOMER" });
    const user = userEvent.setup();

    render(
      <BillingSettingsForm
        subscription={{ status: "past_due", plan: "Pro", current_period_end: null }}
        plans={plans}
        checkoutResult={null}
      />,
    );
    await user.click(screen.getByText("manageAction"));

    expect(createPortalSession).toHaveBeenCalledTimes(1);
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });
});
