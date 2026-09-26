import 'server-only';
import { createHash } from 'node:crypto';
import { rpc } from './banco';

export const ipDe = (request: Request) =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';

const hash = (valor: string) => createHash('sha256').update(`${process.env.CERTA_SAL ?? 'certa'}:${valor}`).digest('hex').slice(0, 32);

/**
 * Janela deslizante gravada no banco (na Vercel cada requisição pode cair em
 * outra instância, então contador em memória não serve). true = liberado.
 */
export async function consumir(chave: string, acao: string, limite: number, janelaHoras: number): Promise<boolean> {
  try {
    return await rpc<boolean>('certa_consumir', { p_chave: hash(chave), p_acao: acao, p_limite: limite, p_janela_horas: janelaHoras });
  } catch (error) {
    console.error('[certa] limite indisponível, liberando:', error);
    return true;
  }
}
