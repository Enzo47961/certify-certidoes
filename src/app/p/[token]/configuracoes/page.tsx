import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Cabecalho } from '@/components/cabecalho';
import { Configuracoes } from '@/components/configuracoes';
import { espacoPorToken } from '@/lib/dados';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Exportar e integrar', robots: { index: false, follow: false } };

export default async function PaginaConfig({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const espaco = await espacoPorToken(token);
  if (!espaco) notFound();
  if (espaco.leitura) redirect(`/p/${token}`);
  return (
    <div className="min-h-dvh">
      <Cabecalho token={token} nome={espaco.nome} demo={espaco.demo} ativo="config" />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Configuracoes
          token={token}
          espaco={{
            nome: espaco.nome,
            demo: espaco.demo,
            alerta_ativo: espaco.alerta_ativo,
            alerta_dias: espaco.alerta_dias,
            webhook_url: espaco.webhook_url,
            webhook_segredo: espaco.demo ? '••••••••' : espaco.webhook_segredo,
            token_leitura: espaco.token_leitura,
          }}
        />
      </main>
    </div>
  );
}
