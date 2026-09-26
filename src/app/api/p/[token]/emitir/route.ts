import { NextResponse } from 'next/server';
import { emitirParaEmpresa } from '@/lib/acoes';
import { TIPOS, type TipoCertidao } from '@/lib/catalogo';
import { consumir, ipDe } from '@/lib/limite';
import { empresaDoEspaco, erro, espacoDoToken, tratar } from '@/lib/rota';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** POST { empresaId, tipos? } — emite o que dá automaticamente; o resto volta como "assistida". */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  return tratar(async () => {
    const espaco = await espacoDoToken((await params).token, true);
    const corpo = (await request.json().catch(() => ({}))) as { empresaId?: string; tipos?: string[] };
    const empresa = await empresaDoEspaco(espaco, corpo.empresaId);
    const tipos = (corpo.tipos?.length ? corpo.tipos : TIPOS).filter((t): t is TipoCertidao => (TIPOS as string[]).includes(t));

    // Demo: por pessoa. Painel real: por painel (protege os serviços públicos de abuso).
    const [chave, limite] = espaco.demo ? [ipDe(request), 40] : [espaco.id, 60];
    if (!(await consumir(chave, 'emitir', limite, 1))) return erro(429, 'Muitas emissões na última hora. Tente de novo mais tarde.');

    return NextResponse.json({ resultados: await emitirParaEmpresa(espaco, empresa, tipos) });
  });
}
