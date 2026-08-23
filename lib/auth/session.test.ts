import { beforeEach, describe, expect, it } from "vitest";
import { resetMockRequest } from "@/test/mocks/next-headers";
import "@/test/mocks/next-headers";
import { requireUser, UnauthorizedError } from "./session";

beforeEach(() => {
  resetMockRequest();
});

describe("requireUser", () => {
  it("rejects when there is no session cookie at all", async () => {
    await expect(requireUser()).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
