import "server-only";
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common";
import * as zxcvbnEnPackage from "@zxcvbn-ts/language-en";
import { ZxcvbnFactory } from "@zxcvbn-ts/core";
import { pwnedPassword } from "hibp";
import { z } from "zod";

const MIN_LENGTH = 12;
const MIN_STRENGTH_SCORE = 2; // zxcvbn's 0-4 scale; 2 = "somewhat guessable" is the floor

const zxcvbn = new ZxcvbnFactory({
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEnPackage.dictionary,
  },
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  translations: zxcvbnEnPackage.translations,
});

/**
 * Length + complexity, checked synchronously — this is the part that never fails open,
 * since it needs no network call.
 */
export function checkPasswordStrength(
  password: string,
): { ok: true } | { ok: false; reason: "tooShort" | "tooWeak" } {
  if (password.length < MIN_LENGTH) {
    return { ok: false, reason: "tooShort" };
  }
  const result = zxcvbn.check(password);
  if (result.score < MIN_STRENGTH_SCORE) {
    return { ok: false, reason: "tooWeak" };
  }
  return { ok: true };
}

/**
 * Checks the password against Have I Been Pwned's Pwned Passwords list via k-anonymity (only
 * a SHA-1 prefix ever leaves this server — the full password never does). Fails OPEN: if the
 * network call itself fails, this returns `{ ok: true }` rather than blocking signup on an
 * unrelated third-party outage — see openspec/changes/add-auth-foundation/design.md.
 */
export async function checkPasswordNotBreached(
  password: string,
): Promise<{ ok: true } | { ok: false; reason: "breached" }> {
  try {
    const timesSeen = await pwnedPassword(password);
    if (timesSeen > 0) {
      return { ok: false, reason: "breached" };
    }
    return { ok: true };
  } catch (error) {
    console.error("breached-password check failed, failing open", error);
    return { ok: true };
  }
}

/**
 * Full check used by signup/reset-password Server Actions: strength first (cheap, no
 * network), then breach check (network, fail-open) only if strength already passed.
 */
export async function validatePassword(
  password: string,
): Promise<{ ok: true } | { ok: false; reason: "tooShort" | "tooWeak" | "breached" }> {
  const strength = checkPasswordStrength(password);
  if (!strength.ok) return strength;

  return checkPasswordNotBreached(password);
}

// Shape-only validation for form-level Zod schemas (signup/reset-password forms) — the real
// strength/breach checks above run server-side in the Server Action, never trusting the
// client to have run them. This schema just keeps obviously-too-short input from round
// tripping to the server at all.
export const passwordSchema = z.string().min(MIN_LENGTH);
