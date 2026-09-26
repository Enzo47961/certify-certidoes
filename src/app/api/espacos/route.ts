import { NextResponse } from 'next/server';
import { criarEspaco } from '@/lib/dados';
import { consumir, ipDe } from '@/lib/limite';
import { erro, tratar } from '@/lib/rota';

export const dynamic = 'force-dynamic';

/** POST /api/espacos — cria um painel novo (sem cadastro) e devolve o link secreto. */
export async function POST(request: Request) {
  return tratar(async () => {
    if (!(await consumir(ipDe(request), 'criar-espaco', 5, 24))) {
      return erro(429, 'Você já criou 5 painéis hoje. Use um dos links que já tem.');
    }
    const corpo = (await request.json().catch(() => ({}))) as { nome?: string };
    const espaco = await criarEspaco(String(corpo.nome ?? '').slice(0, 80));
    return NextResponse.json({ token: espaco.token });
  });
}
