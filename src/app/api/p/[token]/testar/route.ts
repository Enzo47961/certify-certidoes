import { NextResponse } from 'next/server';
import { enviarAlertas } from '@/lib/agendador';
import { registrarEvento } from '@/lib/dados';
import { enviarWebhook } from '@/lib/entrega/webhook';
import { consumir } from '@/lib/limite';
import { erro, espacoDoToken, tratar } from '@/lib/rota';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** POST — envia um teste para a integração e, se houver, os avisos de vencimento pendentes. */
export async function POST(_: Request, { params }: { params: Promise<{ token: string }> }) {
  return tratar(async () => {
    const espaco = await espacoDoToken((await params).token, true);
    if (espaco.demo) return erro(403, 'Na demonstração a integração fica desligada. Crie o seu painel para testar com o seu sistema.');
    if (!espaco.webhook_url) return erro(400, 'Cadastre o endereço da integração primeiro.');
    if (!(await consumir(espaco.id, 'testar', 10, 1))) return erro(429, 'Muitos testes na última hora.');

    const r = await enviarWebhook(espaco.webhook_url, espaco.webhook_segredo, 'teste', { mensagem: 'Teste de integração do CERTIFY', painel: espaco.nome });
    await registrarEvento(espaco.id, 'webhook', r.ok ? 'ok' : 'erro', `Teste: ${r.detalhe}`);
    if (!r.ok) return erro(400, r.detalhe);
    const avisos = await enviarAlertas(espaco);
    return NextResponse.json({ ...r, detalhe: avisos ? `${r.detalhe} ${avisos} aviso(s) de vencimento enviados junto.` : r.detalhe });
  });
}
