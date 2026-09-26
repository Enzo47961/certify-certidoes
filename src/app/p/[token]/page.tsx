import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Cabecalho } from '@/components/cabecalho';
import { LinkNovo } from '@/components/link-novo';
import { Leitura } from '@/components/leitura';
import { Painel } from '@/components/painel';
import { TIPOS, type Rota, type TipoCertidao } from '@/lib/catalogo';
import { empresasDo, espacoPorToken, eventos } from '@/lib/dados';
import { rotaDe } from '@/lib/emissores';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Painel de certidões', robots: { index: false, follow: false } };

export default async function PaginaPainel({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ novo?: string }> }) {
  const { token } = await params;
  const espaco = await espacoPorToken(token);
  if (!espaco) notFound();
  const empresas = await empresasDo(espaco.id);

  // Link de leitura: página enxuta, só para consultar e baixar.
  if (espaco.leitura) return <Leitura token={token} nome={espaco.nome} empresas={empresas} />;

  const [lista] = await Promise.all([eventos(espaco.id)]);
  const rotas = Object.fromEntries(
    empresas.map((e) => [e.id, Object.fromEntries(TIPOS.map((t) => [t, rotaDe(t, e, espaco.demo)]))]),
  ) as Record<string, Record<TipoCertidao, Rota>>;

  return (
    <div className="min-h-dvh">
      <Cabecalho token={token} nome={espaco.nome} demo={espaco.demo} ativo="painel" />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {(await searchParams).novo && !espaco.demo ? <LinkNovo token={token} /> : null}
        <Painel
          espaco={{ token, token_leitura: espaco.token_leitura, nome: espaco.nome, demo: espaco.demo, alerta_dias: espaco.alerta_dias, email: espaco.email }}
          empresas={empresas}
          eventos={lista}
          rotas={rotas}
        />
      </main>
    </div>
  );
}
