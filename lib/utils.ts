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
