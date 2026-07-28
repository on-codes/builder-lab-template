// Server client — use in Server Components / Server Actions / Route Handlers.
// Reads and writes the session via httpOnly cookies managed by @supabase/ssr.
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
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
            // setAll called from a Server Component — fine as long as the middleware refreshes
            // the session
          }
        },
      },
    },
  );
}

// service_role client — ONLY for Route Handlers/Server Actions that need to deliberately
// bypass RLS (e.g. a Stripe webhook updating a user's status).
// Never import this file from code that runs in the browser.
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
