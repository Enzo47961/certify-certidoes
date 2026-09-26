import { arquivo } from '@/lib/dados';
import { erro, espacoDoToken, tratar } from '@/lib/rota';

export const dynamic = 'force-dynamic';

/** GET — o PDF da certidão (inline para visualizar; ?baixar=1 para salvar). Aceita o link de leitura. */
export async function GET(request: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  return tratar(async () => {
    const { token, id } = await params;
    const espaco = await espacoDoToken(token, false);
    if (!/^[0-9a-f-]{36}$/.test(id)) return erro(404, 'Certidão não encontrada.');
    const a = await arquivo(espaco.id, id);
    if (!a) return erro(404, 'Certidão sem arquivo.');
    const baixar = new URL(request.url).searchParams.get('baixar') === '1';
    const nome = (a.nome ?? 'certidao.pdf').replace(/"/g, '');
    return new Response(Buffer.from(a.arquivo, 'base64'), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${baixar ? 'attachment' : 'inline'}; filename="${nome}"`,
        'Cache-Control': 'private, max-age=300',
        'X-Robots-Tag': 'noindex',
      },
    });
  });
}
