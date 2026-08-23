import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock() factories are hoisted above every other statement in the file, including
// preceding `const`s — a plain `const mockX = vi.fn()` referenced inside the factory below
// hits a temporal-dead-zone ReferenceError the moment the mocked module is imported.
// vi.hoisted() is the documented fix: it hoists the variable's creation along with the mocks.
const { mockConstructEvent } = vi.hoisted(() => ({
  mockConstructEvent: vi.fn<(payload: string, signature: string, secret: string) => unknown>(),
}));

vi.mock("@/lib/stripe/client", () => ({
  stripe: {
    webhooks: { constructEvent: mockConstructEvent },
  },
}));

const { mockInsert } = vi.hoisted(() => ({
  mockInsert: vi.fn<(row: { event_id: string }) => Promise<{ error: { code: string } | null }>>(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({ insert: mockInsert }),
  }),
}));

import { POST } from "./route";

function makeRequest(options: { signature?: string | null } = {}): Request {
  const headers = new Headers();
  if (options.signature !== null) {
    headers.set("stripe-signature", options.signature ?? "t=1,v1=deadbeef");
  }
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers,
    // The body's contents don't matter for these tests — constructEvent() is mocked, so
    // nothing ever parses this as real Stripe event JSON.
    body: "{}",
  });
}

beforeEach(() => {
  mockConstructEvent.mockReset();
  mockInsert.mockReset();
});

describe("Stripe webhook signature verification", () => {
  it("rejects with 400 when the stripe-signature header is missing", async () => {
    const response = await POST(makeRequest({ signature: null }));

    expect(response.status).toBe(400);
    expect(mockConstructEvent).not.toHaveBeenCalled();
  });

  it("rejects with 400 when signature verification throws", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("No matching signature found");
    });

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Invalid signature" });
    // A bad signature must never reach the idempotency table, let alone any handler.
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

describe("Stripe webhook idempotency", () => {
  it("records a new event and returns received:true", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_test_1",
      type: "payment_intent.created",
      data: { object: {} },
    });
    mockInsert.mockResolvedValue({ error: null });

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ received: true });
    expect(mockInsert).toHaveBeenCalledWith({ event_id: "evt_test_1" });
  });

  it("short-circuits as a duplicate, without reprocessing, when the event id was already recorded", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_test_1",
      type: "payment_intent.created",
      data: { object: {} },
    });
    // 23505 = Postgres unique_violation — the insert-first-then-check-the-conflict pattern
    // this table exists for (see design.md). This must never be treated as a hard failure.
    mockInsert.mockResolvedValue({ error: { code: "23505" } });

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ received: true, duplicate: true });
  });

  it("returns 500 on an unexpected insert error instead of silently treating it as a duplicate", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_test_1",
      type: "payment_intent.created",
      data: { object: {} },
    });
    mockInsert.mockResolvedValue({ error: { code: "42501" } });

    const response = await POST(makeRequest());

    expect(response.status).toBe(500);
  });
});
