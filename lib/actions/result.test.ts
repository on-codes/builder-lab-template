import { describe, expect, it } from "vitest";
import { fail, ok } from "./result";

describe("ActionResult helpers", () => {
  it("ok() wraps data in a success result", () => {
    expect(ok({ id: 1 })).toEqual({ success: true, data: { id: 1 } });
  });

  it("fail() wraps an error code in a failure result", () => {
    expect(fail("NOT_FOUND")).toEqual({ success: false, error: "NOT_FOUND" });
  });
});
