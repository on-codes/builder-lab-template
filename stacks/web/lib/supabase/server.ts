// Server client — usar em Server Components / Server Actions / Route Handlers.
// Lê e escreve a sessão via cookies httpOnly geridos pelo @supabase/ssr.
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
            // setAll chamado de um Server Component — ok se o middleware já atualiza a sessão
          }
        },
      },
    },
  );
}

// Client com service_role — SÓ para Route Handlers/Server Actions que precisam bypassar RLS
// de forma consciente (ex.: webhook do Stripe atualizando o status de um usuário).
// Nunca importar este arquivo em código que roda no navegador.
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
