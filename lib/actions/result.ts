/**
 * Every auth Server Action returns this shape instead of throwing across the server/client
 * boundary — `error` is a stable code the calling screen maps to a translated message via
 * next-intl (see .claude/skills/i18n/SKILL.md), never a hardcoded string from the action
 * itself.
 */
export type ActionResult<T = undefined, E extends string = string> =
  | { success: true; data: T }
  | { success: false; error: E };

export function ok<T>(data: T): ActionResult<T, never> {
  return { success: true, data };
}

export function fail<E extends string>(error: E): ActionResult<never, E> {
  return { success: false, error };
}
