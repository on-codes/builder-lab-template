// service_role client — bypasses Row Level Security entirely. ONLY for Server Actions /
// Route Handlers / Edge Functions that deliberately need to act outside a specific user's
// own access (e.g. writing an MFA code, syncing a Stripe webhook). NEVER import this file
// from a Client Component or anything that could ship to the browser — grep for
// "service.ts" if you're unsure whether a file is server-only.
import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
