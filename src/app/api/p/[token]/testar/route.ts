import { NextResponse } from 'next/server';
import { enviarAlertas, enviarResumoSemanal } from '@/lib/agendador';
import { registrarEvento } from '@/lib/dados';
import { enviarWebhook } from '@/lib/entrega/webhook';
import { consumir } from '@/lib/limite';
import { erro, espacoDoToken, tratar } from '@/lib/rota';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** POST { acao: 'email' | 'webhook' } — "enviar agora", para testar a configuração. */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  return tratar(async () => {
    const espaco = await espacoDoToken((await params).token, true);
    if (espaco.demo) return erro(403, 'Na demonstração os envios ficam desligados. Crie o seu painel para testar com o seu e-mail.');
    if (!(await consumir(espaco.id, 'testar', 10, 1))) return erro(429, 'Muitos testes na última hora.');
    const { acao } = (await request.json().catch(() => ({}))) as { acao?: string };

    if (acao === 'email') {
      const r = await enviarResumoSemanal(espaco);
      if (r.ok) await enviarAlertas(espaco);
      return r.ok ? NextResponse.json(r) : erro(400, r.detalhe);
    }
    if (acao === 'webhook') {
      if (!espaco.webhook_url) return erro(400, 'Cadastre o endereço do webhook primeiro.');
      const r = await enviarWebhook(espaco.webhook_url, espaco.webhook_segredo, 'teste', { mensagem: 'Teste de integração do CERTA', painel: espaco.nome });
      await registrarEvento(espaco.id, 'webhook', r.ok ? 'ok' : 'erro', `Teste: ${r.detalhe}`);
      return r.ok ? NextResponse.json(r) : erro(400, r.detalhe);
    }
    return erro(400, 'Ação desconhecida.');
  });
}
