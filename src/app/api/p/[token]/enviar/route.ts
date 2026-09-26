import { NextResponse } from 'next/server';
import { receberPdf } from '@/lib/acoes';
import { TIPOS, type TipoCertidao } from '@/lib/catalogo';
import { empresaDoEspaco, erro, espacoDoToken, tratar } from '@/lib/rota';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_BYTES = 5 * 1024 * 1024;

/** POST multipart { empresaId, tipo?, confirmar?, arquivo } — emissão assistida: lê o PDF oficial. */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  return tratar(async () => {
    const espaco = await espacoDoToken((await params).token, true);
    const form = await request.formData().catch(() => null);
    if (!form) return erro(400, 'Envie o PDF da certidão.');
    const empresa = await empresaDoEspaco(espaco, form.get('empresaId'));
    const arquivo = form.get('arquivo');
    if (!(arquivo instanceof File)) return erro(400, 'Envie o PDF da certidão.');
    if (arquivo.size > MAX_BYTES) return erro(413, 'O PDF passa de 5 MB. Certidões oficiais costumam ter menos de 500 KB.');
    const tipo = String(form.get('tipo') ?? '');

    const r = await receberPdf(espaco, empresa, new Uint8Array(await arquivo.arrayBuffer()), arquivo.name, {
      tipo: (TIPOS as string[]).includes(tipo) ? (tipo as TipoCertidao) : undefined,
      confirmar: form.get('confirmar') === '1',
    });
    return r.ok ? NextResponse.json(r) : erro(422, r.erro, { precisaConfirmar: Boolean(r.precisaConfirmar) });
  });
}
