import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind class names, resolving conflicts (e.g. `p-2` vs `p-4`) the
 * way the last one wins. Standard shadcn/ui helper — every component below
 * uses this instead of template-literal class strings.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Shared avatar-fallback initials logic — display name if set (first + last word), otherwise
 * the first two characters of the email's local part. Used by both the topbar UserMenu and the
 * Profile settings screen so the two never drift apart.
 */
export function getInitials(name: string | null | undefined, email: string): string {
  const trimmedName = name?.trim();
  if (trimmedName) {
    const parts = trimmedName.split(/\s+/).filter(Boolean);
    const initials =
      parts.length > 1
        ? parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
        : parts[0].slice(0, 2);
    return initials.toUpperCase();
  }

  const [localPart] = email.split("@");
  return (localPart ?? email).slice(0, 2).toUpperCase();
}
