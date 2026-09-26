import 'server-only';

/**
 * Acesso ao Supabase só pelas funções `public.certa_*`, que exigem o segredo do
 * servidor. As tabelas ficam no schema `certidoes`, fora da API REST.
 */
export async function rpc<T>(funcao: string, parametros: Record<string, unknown> = {}, timeoutMs = 15_000): Promise<T> {
  const url = `${process.env.SUPABASE_URL!.replace(/\/+$/, '')}/rest/v1/rpc/${funcao}`;
  const resposta = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_segredo: process.env.CERTA_SEGREDO, ...parametros }),
    signal: AbortSignal.timeout(timeoutMs),
    cache: 'no-store',
  });
  const texto = await resposta.text();
  if (!resposta.ok) {
    let mensagem = texto;
    try {
      mensagem = (JSON.parse(texto) as { message?: string }).message ?? texto;
    } catch {
      /* corpo não é JSON */
    }
    throw new Error(`${funcao}: ${mensagem.slice(0, 200)}`);
  }
  return (texto ? JSON.parse(texto) : null) as T;
}
