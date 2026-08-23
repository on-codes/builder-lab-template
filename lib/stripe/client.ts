import "server-only";
// Aliased on import: the "stripe" package's default export (the SDK constructor) and its
// named type-namespace export are both called `Stripe`, which oxlint's
// import/no-named-as-default rule flags as confusing to import under the same name.
import StripeSDK from "stripe";

// A single Stripe SDK instance, server-only. Test-mode by default — see
// .claude/skills/stripe-billing/SKILL.md: this reads whatever STRIPE_SECRET_KEY is set to
// (sk_test_... during development, sk_live_... only once the person has explicitly confirmed
// they're ready to charge real customers), never hardcodes a mode.
export const stripe = new StripeSDK(process.env.STRIPE_SECRET_KEY!);
