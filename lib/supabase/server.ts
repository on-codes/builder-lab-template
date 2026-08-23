// Server client — use in Server Components / Server Actions / Route Handlers. Reads and
// writes the session via httpOnly cookies managed by @supabase/ssr. cookies() is async-only
// in Next.js 16 (see CLAUDE.md 1.1) — this function is async for the same reason.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, which can't set cookies — fine, as long as
            // proxy.ts is also refreshing the session on every request.
          }
        },
      },
    },
  );
}
