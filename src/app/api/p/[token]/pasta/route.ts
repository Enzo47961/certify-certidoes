import { registrarEvento, vigentesComArquivo } from '@/lib/dados';
import { montarZip } from '@/lib/entrega/zip';
import { erro, espacoDoToken, tratar } from '@/lib/rota';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** GET — todas as certidões vigentes em um ZIP organizado por empresa, com resumo.csv. */
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  return tratar(async () => {
    const espaco = await espacoDoToken((await params).token, false);
    const vigentes = await vigentesComArquivo(espaco.id);
    if (vigentes.length === 0) return erro(404, 'Ainda não há certidões para baixar.');
    const zip = montarZip(vigentes);
    await registrarEvento(espaco.id, 'pasta', 'info', `Pasta ZIP baixada (${vigentes.length} certidões).`);
    const data = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    return new Response(Buffer.from(zip), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="certidoes-${data}.zip"`,
        'Cache-Control': 'no-store',
      },
    });
  });
}
