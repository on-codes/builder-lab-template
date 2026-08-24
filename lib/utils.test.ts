import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("joins truthy class names, skipping nullish ones", () => {
    expect(cn("a", "b", undefined, null, "d")).toBe("a b d");
  });

  it("resolves conflicting Tailwind utilities, keeping the last one", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("supports the conditional-object form", () => {
    expect(cn("base", { active: true, hidden: false })).toBe("base active");
  });
});
