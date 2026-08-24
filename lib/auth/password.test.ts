import { describe, expect, it, vi } from "vitest";

vi.mock("hibp", () => ({
  pwnedPassword: vi.fn<(password: string) => Promise<number>>(),
}));

import { pwnedPassword } from "hibp";
import { checkPasswordNotBreached, checkPasswordStrength } from "./password";

describe("checkPasswordStrength", () => {
  it("rejects a password shorter than the minimum length", () => {
    const result = checkPasswordStrength("Short1!");
    expect(result).toEqual({ ok: false, reason: "tooShort" });
  });

  it("rejects a long but easily-guessable password", () => {
    const result = checkPasswordStrength("passwordpasswordpassword");
    expect(result).toEqual({ ok: false, reason: "tooWeak" });
  });

  it("accepts a long, high-entropy password", () => {
    const result = checkPasswordStrength("xK9$mQ2!vL7pR4wZ");
    expect(result).toEqual({ ok: true });
  });
});

describe("checkPasswordNotBreached", () => {
  it("rejects a password found in the breach list", async () => {
    vi.mocked(pwnedPassword).mockResolvedValueOnce(3722);
    const result = await checkPasswordNotBreached("anything");
    expect(result).toEqual({ ok: false, reason: "breached" });
  });

  it("accepts a password not found in the breach list", async () => {
    vi.mocked(pwnedPassword).mockResolvedValueOnce(0);
    const result = await checkPasswordNotBreached("anything");
    expect(result).toEqual({ ok: true });
  });

  it("fails open when the breach-check network call fails", async () => {
    vi.mocked(pwnedPassword).mockRejectedValueOnce(new Error("network down"));
    const result = await checkPasswordNotBreached("anything");
    expect(result).toEqual({ ok: true });
  });
});
