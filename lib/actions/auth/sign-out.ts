"use server";

import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { endCurrentSession } from "@/lib/auth/session";

export async function signOut(): Promise<void> {
  await endCurrentSession();
  // Server Actions have no ambient locale to infer (unlike a rendered page), so it's passed
  // explicitly. Fine while there's only one locale; once a second one ships, thread the
  // caller's actual locale through instead of defaulting.
  redirect({ href: "/login", locale: routing.defaultLocale });
}
