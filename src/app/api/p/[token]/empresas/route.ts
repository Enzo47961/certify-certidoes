import { NextResponse } from 'next/server';
import { cnpjValido, soDigitos } from '@/lib/cnpj';
import { consultarCnpj } from '@/lib/consulta-cnpj';
import { adicionarEmpresa, empresasDo, registrarEvento } from '@/lib/dados';
import { consumir, ipDe } from '@/lib/limite';
import { erro, espacoDoToken, tratar } from '@/lib/rota';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ token: string }> };

export async function GET(_: Request, { params }: Params) {
  return tratar(async () => {
    const espaco = await espacoDoToken((await params).token, false);
    return NextResponse.json(await empresasDo(espaco.id));
  });
}

/** POST { cnpj } — busca os dados na Receita e cadastra a empresa. */
export async function POST(request: Request, { params }: Params) {
  return tratar(async () => {
    const espaco = await espacoDoToken((await params).token, true);
    // A demonstração gera certidões de exemplo: não pode receber empresas reais.
    if (espaco.demo) return erro(403, 'A demonstração usa só empresas fictícias. Crie o seu painel para acompanhar empresas reais.');
    const { cnpj: bruto } = (await request.json().catch(() => ({}))) as { cnpj?: string };
    const cnpj = soDigitos(String(bruto ?? ''));
    if (!cnpjValido(cnpj)) return erro(400, 'CNPJ inválido: confira os dígitos.');
    if (!(await consumir(ipDe(request), 'cnpj', 60, 1))) return erro(429, 'Muitas consultas seguidas. Aguarde alguns minutos.');

    const dados = await consultarCnpj(cnpj);
    if (!dados) return erro(404, 'CNPJ não encontrado na Receita Federal.');
    const empresa = await adicionarEmpresa(espaco.id, {
      cnpj,
      razao_social: dados.razao_social,
      nome_fantasia: dados.nome_fantasia,
      uf: dados.uf,
      municipio: dados.municipio,
      codigo_ibge: dados.codigo_ibge,
    });
    await registrarEvento(espaco.id, 'empresa', 'info', `${dados.razao_social} adicionada (${dados.municipio ?? ''}/${dados.uf ?? ''}).`);
    return NextResponse.json({ empresa, situacaoCadastral: dados.situacao });
  });
}
