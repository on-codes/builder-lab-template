import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// `server-only` resolves based on the "react-server" package export condition, which only
// Next.js's own bundler sets — under Vitest it always falls through to the throwing variant,
// which would break every lib/ file (and its transitive importers) that has
// `import "server-only"` at the top the moment a test touches it. Vitest tests never ship to
// a browser either way, so replacing the package outright with a no-op is accurate, and
// (unlike forcing the "react-server" condition globally) doesn't also flip react-dom/server
// into its RSC-only variant, which @react-email/render's tests need to be the regular one.
vi.mock("server-only", () => ({}));

// Dummy but well-formed values so lib/supabase/{client,server,service}.ts can construct a
// client in tests without throwing — no test in this repo makes a real network call through
// one; anything that would is mocked at the module boundary (see test/mocks/).
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test-service-role-key";
process.env.NEXT_PUBLIC_SITE_URL ||= "https://example.com";
process.env.OTP_HASH_SECRET ||= "test-otp-secret";
process.env.RESEND_API_KEY ||= "test-resend-key";
process.env.STRIPE_SECRET_KEY ||= "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET ||= "whsec_test_dummy";
process.env.STRIPE_PRICE_ID_PRO ||= "price_test_pro";
process.env.STRIPE_PRICE_ID_BUSINESS ||= "price_test_business";
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||= "pk_test_dummy";
