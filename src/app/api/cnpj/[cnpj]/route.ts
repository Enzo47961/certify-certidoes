import { NextResponse } from 'next/server';
import { cnpjValido, soDigitos } from '@/lib/cnpj';
import { consultarCnpj } from '@/lib/consulta-cnpj';
import { consumir, ipDe } from '@/lib/limite';
import { erro, tratar } from '@/lib/rota';

export const dynamic = 'force-dynamic';

/** GET /api/cnpj/:cnpj — razão social, UF e município (dados públicos da Receita). */
export async function GET(request: Request, contexto: { params: Promise<{ cnpj: string }> }) {
  return tratar(async () => {
    const cnpj = soDigitos((await contexto.params).cnpj);
    if (!cnpjValido(cnpj)) return erro(400, 'CNPJ inválido: confira os dígitos.');
    if (!(await consumir(ipDe(request), 'cnpj', 60, 1))) return erro(429, 'Muitas consultas seguidas. Aguarde alguns minutos.');
    const dados = await consultarCnpj(cnpj);
    if (!dados) return erro(404, 'CNPJ não encontrado na Receita Federal.');
    return NextResponse.json(dados);
  });
}
