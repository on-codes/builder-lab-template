import { vi } from "vitest";

/**
 * `next/headers`'s cookies()/headers() only work inside Next.js's own request-scoped async
 * context — calling them directly under Vitest throws. Every test that exercises a Server
 * Action (which reads/writes cookies via lib/auth/cookies.ts, or reads the client IP via
 * lib/actions/client-ip.ts) needs this mocked. Import `resetMockRequest()` in a `beforeEach`
 * and `mockCookieStore`/`mockHeaderStore` to arrange/assert cookie and header state.
 */

type CookieOptions = Record<string, unknown>;
type StoredCookie = { value: string; options?: CookieOptions };

export const mockCookieStore = new Map<string, StoredCookie>();
export const mockHeaderStore = new Map<string, string>();

export function resetMockRequest() {
  mockCookieStore.clear();
  mockHeaderStore.clear();
  mockHeaderStore.set("x-forwarded-for", "203.0.113.1");
}

const cookiesApi = {
  get: (name: string) => {
    const entry = mockCookieStore.get(name);
    return entry ? { name, value: entry.value } : undefined;
  },
  getAll: () => Array.from(mockCookieStore.entries()).map(([name, { value }]) => ({ name, value })),
  has: (name: string) => mockCookieStore.has(name),
  set: (name: string, value: string, options?: CookieOptions) => {
    mockCookieStore.set(name, { value, options });
  },
  delete: (name: string) => {
    mockCookieStore.delete(name);
  },
};

const headersApi = {
  get: (name: string) => mockHeaderStore.get(name.toLowerCase()) ?? null,
  has: (name: string) => mockHeaderStore.has(name.toLowerCase()),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn<() => Promise<typeof cookiesApi>>(async () => cookiesApi),
  headers: vi.fn<() => Promise<typeof headersApi>>(async () => headersApi),
}));
