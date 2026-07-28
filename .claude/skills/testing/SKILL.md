---
name: testing
description: Use this skill whenever you finish building a feature (a route, Server Action, screen, business-logic function, or Supabase policy) — a feature isn't done until it has a passing unit test. Covers the Vitest setup shared by the web and mobile tracks.
---

# Testing — every feature ships with a test

## Stack

- **Vitest** for both tracks (works for Next.js server code and React Native/Expo logic
  alike). React Testing Library for component-level tests where relevant.
- Test files live next to the code: `feature.ts` → `feature.test.ts`.

## What must be tested

- Any Server Action / Route Handler / Edge Function: at least one "happy path" test and one
  "rejected/unauthorized" test.
- Any Supabase RLS policy: a test that confirms User A cannot read/write User B's row (use two
  authenticated test clients, or the `supabase-js` client with different JWTs).
- Any pricing/business-logic function (totals, discounts, subscription state transitions):
  cover the normal case and at least one edge case (zero, negative, boundary).
- Stripe webhook handlers: test with a sample event payload, and a test that an invalid
  signature is rejected.

## Commands

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

## Claude's workflow

1. Write the feature.
2. Write the test(s) covering the checklist above.
3. Run `pnpm test` — all green before moving on. (This template uses pnpm as its only
   package manager; never run `npm` or `yarn`.)
4. Only then run the code-quality checks and consider the task complete.

A feature without a test is not "done" — don't report it as finished to the person, and don't
let it into a PR that's about to merge.
