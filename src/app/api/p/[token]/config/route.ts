import { NextResponse } from 'next/server';
import { configurar } from '@/lib/dados';
import { urlPermitida } from '@/lib/entrega/webhook';
import { erro, espacoDoToken, tratar } from '@/lib/rota';

export const dynamic = 'force-dynamic';

/** POST — nome do painel, janela de alerta e integração (webhook). */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  return tratar(async () => {
    const espaco = await espacoDoToken((await params).token, true);
    const c = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const config: Record<string, unknown> = {};

    if (typeof c.nome === 'string') config.nome = c.nome.slice(0, 80);
    if ('webhook_url' in c) {
      if (espaco.demo) return erro(403, 'Na demonstração a integração fica desligada. Crie o seu painel para configurar.');
      const url = String(c.webhook_url ?? '').trim();
      const problema = url ? urlPermitida(url) : null;
      if (problema) return erro(400, problema);
      config.webhook_url = url;
    }
    if (typeof c.alerta_ativo === 'boolean') config.alerta_ativo = c.alerta_ativo;
    if (Number.isInteger(c.alerta_dias) && (c.alerta_dias as number) >= 1 && (c.alerta_dias as number) <= 90) config.alerta_dias = c.alerta_dias;

    const atualizado = await configurar(espaco.id, config);
    return NextResponse.json({ ok: true, espaco: { ...atualizado, token: undefined } });
  });
}
