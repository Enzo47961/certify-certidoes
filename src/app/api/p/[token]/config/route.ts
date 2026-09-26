import { NextResponse } from 'next/server';
import { configurar } from '@/lib/dados';
import { urlPermitida } from '@/lib/entrega/webhook';
import { erro, espacoDoToken, tratar } from '@/lib/rota';

export const dynamic = 'force-dynamic';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** POST — nome, e-mail, rotina semanal (dia/hora), alertas e webhook. */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  return tratar(async () => {
    const espaco = await espacoDoToken((await params).token, true);
    const c = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const config: Record<string, unknown> = {};

    if (typeof c.nome === 'string') config.nome = c.nome.slice(0, 80);
    if ('email' in c || 'webhook_url' in c) {
      if (espaco.demo) return erro(403, 'Na demonstração o e-mail e a integração ficam desligados. Crie o seu painel para configurar.');
    }
    if ('email' in c) {
      const email = String(c.email ?? '').trim();
      if (email && !EMAIL.test(email)) return erro(400, 'E-mail inválido.');
      config.email = email;
    }
    if ('webhook_url' in c) {
      const url = String(c.webhook_url ?? '').trim();
      const problema = url ? urlPermitida(url) : null;
      if (problema) return erro(400, problema);
      config.webhook_url = url;
    }
    for (const chave of ['rotina_ativa', 'alerta_ativo'] as const) if (typeof c[chave] === 'boolean') config[chave] = c[chave];
    const inteiro = (v: unknown, min: number, max: number) => (Number.isInteger(v) && (v as number) >= min && (v as number) <= max ? v : undefined);
    if (inteiro(c.rotina_dia, 0, 6) !== undefined) config.rotina_dia = c.rotina_dia;
    if (inteiro(c.rotina_hora, 0, 23) !== undefined) config.rotina_hora = c.rotina_hora;
    if (inteiro(c.alerta_dias, 1, 90) !== undefined) config.alerta_dias = c.alerta_dias;

    const atualizado = await configurar(espaco.id, config);
    return NextResponse.json({ ok: true, espaco: { ...atualizado, token: undefined } });
  });
}
