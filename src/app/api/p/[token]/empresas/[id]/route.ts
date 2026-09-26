import { NextResponse } from 'next/server';
import { historico, registrarEvento, removerEmpresa } from '@/lib/dados';
import { empresaDoEspaco, espacoDoToken, tratar } from '@/lib/rota';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ token: string; id: string }> };

/** Histórico completo de certidões da empresa (todas as emissões). */
export async function GET(_: Request, { params }: Params) {
  return tratar(async () => {
    const { token, id } = await params;
    const espaco = await espacoDoToken(token, false);
    await empresaDoEspaco(espaco, id);
    return NextResponse.json(await historico(espaco.id, id));
  });
}

export async function DELETE(_: Request, { params }: Params) {
  return tratar(async () => {
    const { token, id } = await params;
    const espaco = await espacoDoToken(token, true);
    const empresa = await empresaDoEspaco(espaco, id);
    await removerEmpresa(espaco.id, id);
    await registrarEvento(espaco.id, 'empresa', 'info', `${empresa.razao_social} removida do painel.`);
    return NextResponse.json({ ok: true });
  });
}
