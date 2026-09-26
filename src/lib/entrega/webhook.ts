import 'server-only';
import { createHmac } from 'node:crypto';

/**
 * Integração com sistema interno (jurídico, ERP, GED): a cada certidão nova o
 * CERTA faz um POST JSON assinado. O receptor confere a assinatura com o
 * segredo exibido no painel:
 *   X-Certa-Assinatura: sha256=<HMAC-SHA256(corpo, segredo)>
 */
export function urlPermitida(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return 'Endereço inválido.';
  }
  if (u.protocol !== 'https:') return 'Use um endereço https://.';
  const host = u.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) ||
    host.startsWith('[')
  ) {
    return 'Endereços internos não são permitidos.';
  }
  return null;
}

export type ResultadoWebhook = { ok: boolean; status: number | null; detalhe: string };

export async function enviarWebhook(url: string, segredo: string, evento: string, dados: unknown): Promise<ResultadoWebhook> {
  const bloqueio = urlPermitida(url);
  if (bloqueio) return { ok: false, status: null, detalhe: bloqueio };
  const corpo = JSON.stringify({ evento, enviado_em: new Date().toISOString(), dados });
  const assinatura = createHmac('sha256', segredo).update(corpo).digest('hex');
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'CERTA-webhook/1.0', 'X-Certa-Evento': evento, 'X-Certa-Assinatura': `sha256=${assinatura}` },
      body: corpo,
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    });
    return { ok: r.ok, status: r.status, detalhe: r.ok ? `Entregue (HTTP ${r.status}).` : `O sistema respondeu HTTP ${r.status}.` };
  } catch {
    return { ok: false, status: null, detalhe: 'Sem resposta em 10 s.' };
  }
}
