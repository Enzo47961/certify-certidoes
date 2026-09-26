import { CATALOGO } from '@/lib/catalogo';
import { formatarCnpj } from '@/lib/cnpj';
import type { EmpresaComCertidoes } from '@/lib/dados';
import { dataBr, estadoDa, prazoTexto } from '@/lib/situacao';
import { Marca } from './cabecalho';
import { IconeDownload } from './icones';

const COR = { valida: 'text-ok-700', vencendo: 'text-aviso-700', vencida: 'text-perigo-700', irregular: 'text-perigo-700', pendente: 'text-tinta-400' };

/**
 * Página de download para quem só precisa das certidões (contador, cliente,
 * setor de licitações). Link próprio, sem acesso a configurações nem emissão.
 */
export function Leitura({ token, nome, empresas }: { token: string; nome: string; empresas: EmpresaComCertidoes[] }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-tinta-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Marca />
          <a href={`/api/p/${token}/pasta`} className="inline-flex items-center gap-2 rounded-xl bg-petroleo-800 px-4 py-2 text-sm font-medium text-white hover:bg-petroleo-700">
            <IconeDownload size={16} /> Baixar todas (ZIP)
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-8 sm:px-6">
        <div>
          <p className="text-sm text-tinta-500">Certidões compartilhadas por</p>
          <h1 className="font-display text-2xl font-extrabold">{nome}</h1>
        </div>
        {empresas.length === 0 ? <p className="text-tinta-500">Nenhuma certidão disponível ainda.</p> : null}
        {empresas.map((e) => (
          <section key={e.id} className="rounded-2xl border border-tinta-200 bg-white p-5 shadow-suave">
            <h2 className="font-semibold">{e.razao_social}</h2>
            <p className="text-sm text-tinta-500">
              {formatarCnpj(e.cnpj)} · {e.municipio ?? '—'}/{e.uf ?? '—'}
            </p>
            <ul className="mt-3 divide-y divide-tinta-100">
              {CATALOGO.map((info) => {
                const c = e.certidoes.find((x) => x.tipo === info.tipo);
                const { estado, dias } = estadoDa(c, 15);
                return (
                  <li key={info.tipo} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <span className="min-w-0">
                      <span className="font-medium">{info.nome}</span>
                      <span className={`ml-2 ${COR[estado]}`}>{c ? `${prazoTexto(dias)} · até ${dataBr(c.valida_ate)}` : 'não emitida'}</span>
                    </span>
                    {c?.tem_arquivo ? (
                      <a href={`/api/p/${token}/arquivo/${c.id}?baixar=1`} className="inline-flex items-center gap-1.5 rounded-lg border border-tinta-200 px-2.5 py-1 text-sm font-medium hover:bg-tinta-50">
                        <IconeDownload size={14} /> PDF
                      </a>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        <p className="text-center text-xs text-tinta-400">Gerado pelo CERTA · certidões em dia</p>
      </main>
    </div>
  );
}
