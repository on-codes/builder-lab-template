// Rate limiting simples baseado numa função Postgres atômica.
// Ver supabase/migrations para a tabela `rate_limits` e a função `increment_rate_limit`.
import type { SupabaseClient } from '@supabase/supabase-js';

export class RateLimitError extends Error {
  constructor(message = 'RATE_LIMITED') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export async function checkRateLimit(
  supabase: SupabaseClient,
  key: string,
  limit: number,
  windowSeconds: number,
) {
  const { data, error } = await supabase.rpc('increment_rate_limit', {
    p_key: key,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    // Falha "aberta": nunca derrubar a rota por causa do rate limiter em si.
    console.error('rate limit check failed', error);
    return;
  }

  if (data && data.count > limit) {
    throw new RateLimitError();
  }
}

export async function checkEmailSendLimit(supabase: SupabaseClient, userId: string) {
  // Padrão do template: no máximo 5 e-mails transacionais por usuário por hora.
  await checkRateLimit(supabase, `email:${userId}`, 5, 3600);
}
