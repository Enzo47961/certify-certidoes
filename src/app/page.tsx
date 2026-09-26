import Link from 'next/link';
import { Marca } from '@/components/cabecalho';
import { Comecar } from '@/components/comecar';
import { IconeEmail, IconeEscudo, IconeLink, IconePasta, IconeRaio, IconeSino, IconeUpload } from '@/components/icones';
import { CATALOGO } from '@/lib/catalogo';

const AMOSTRA: Array<[string, string, Array<'ok' | 'aviso' | 'perigo' | 'neutro'>]> = [
  ['Horizonte Engenharia', 'SP', ['ok', 'aviso', 'ok', 'ok', 'neutro', 'ok', 'ok']],
  ['Vale Verde Alimentos', 'MG', ['ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok']],
  ['Litoral Serviços', 'BA', ['ok', 'perigo', 'aviso', 'ok', 'ok', 'ok', 'ok']],
  ['Pampa Log', 'RS', ['ok', 'ok', 'ok', 'aviso', 'ok', 'perigo', 'ok']],
];
const COR = { ok: 'bg-ok-600', aviso: 'bg-aviso-600', perigo: 'bg-perigo-600', neutro: 'bg-tinta-300' };

export default function Inicio() {
  return (
    <div className="min-h-dvh">
      {/* Topo */}
      <section className="relative overflow-hidden bg-petroleo-900 text-white">
        <div className="textura absolute inset-0 opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:pb-24">
          <nav className="flex items-center justify-between">
            <Marca claro />
            <Link href="/demo" className="text-sm font-medium text-petroleo-100 hover:text-white">
              Demonstração
            </Link>
          </nav>

          <div className="mt-14 grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-petroleo-100">
                <IconeEscudo size={14} /> Para escritórios de contabilidade, jurídico e setor de licitações
              </p>
              <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
                As certidões da empresa em dia, sem abrir sete sites.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-petroleo-100">
                Informe o CNPJ. O CERTA reúne Federal, FGTS, Trabalhista, Estadual, Municipal, Falência e a consulta do TCU num painel só, avisa antes de
                vencer e entrega os PDFs por e-mail, pasta ou integração com o seu sistema.
              </p>
              <div className="mt-8">
                <Comecar claro />
              </div>
            </div>

            {/* Miniatura do painel */}
            <div className="rounded-3xl bg-white p-4 text-tinta-900 shadow-alta" aria-hidden>
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-semibold">Contabilidade Horizonte</span>
                <span className="rounded-full bg-aviso-50 px-2 py-0.5 text-[11px] font-semibold text-aviso-700">3 vencendo</span>
              </div>
              <div className="mt-3 overflow-hidden rounded-2xl border border-tinta-100">
                <div className="grid grid-cols-[1.6fr_repeat(7,1fr)] gap-1 bg-tinta-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-tinta-500">
                  <span>Empresa</span>
                  {CATALOGO.map((c) => <span key={c.tipo} className="truncate">{c.nome.split(' ')[0]}</span>)}
                </div>
                {AMOSTRA.map(([nome, uf, estados]) => (
                  <div key={nome} className="grid grid-cols-[1.6fr_repeat(7,1fr)] items-center gap-1 border-t border-tinta-100 px-3 py-2.5">
                    <span className="truncate text-xs font-medium">
                      {nome} <span className="text-tinta-400">· {uf}</span>
                    </span>
                    {estados.map((e, i) => (
                      <span key={i} className={`h-2 w-full max-w-8 rounded-full ${COR[e]}`} />
                    ))}
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
                <span className="rounded-xl bg-ok-50 py-2 font-semibold text-ok-700">22 válidas</span>
                <span className="rounded-xl bg-aviso-50 py-2 font-semibold text-aviso-700">4 vencendo</span>
                <span className="rounded-xl bg-perigo-50 py-2 font-semibold text-perigo-700">2 vencidas</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-20 px-4 py-16 sm:px-6">
        {/* Como funciona */}
        <section>
          <h2 className="font-display text-3xl font-extrabold tracking-tight">Como funciona</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ['1', 'Informe o CNPJ', 'Razão social, UF e município vêm do cadastro público da Receita. O painel já sabe qual SEFAZ, prefeitura e tribunal procurar.'],
              ['2', 'Emita e guarde', 'O que sai automático é emitido na hora. O resto abre no site oficial certo; você envia o PDF e o CERTA lê resultado, número e validade.'],
              ['3', 'Receba antes de vencer', 'Alerta com antecedência, resumo semanal com os PDFs, pasta ZIP organizada e envio para o seu sistema interno.'],
            ].map(([n, t, d]) => (
              <li key={n} className="rounded-3xl border border-tinta-200 bg-white p-6 shadow-suave">
                <span className="font-display text-3xl font-extrabold text-petroleo-500">{n}</span>
                <h3 className="mt-3 font-display text-lg font-bold">{t}</h3>
                <p className="mt-1 text-sm leading-relaxed text-tinta-600">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Certidões */}
        <section>
          <h2 className="font-display text-3xl font-extrabold tracking-tight">As certidões que o CERTA acompanha</h2>
          <p className="mt-2 max-w-2xl text-tinta-600">A validade impressa no PDF sempre prevalece; a coluna mostra o prazo usual de cada órgão.</p>
          <div className="mt-6 overflow-x-auto rounded-3xl border border-tinta-200 bg-white shadow-suave">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-tinta-50 text-xs uppercase tracking-wide text-tinta-500">
                <tr>
                  <th className="px-5 py-3">Certidão</th>
                  <th className="px-5 py-3">Órgão</th>
                  <th className="px-5 py-3">Validade usual</th>
                  <th className="px-5 py-3">Como sai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tinta-100">
                {CATALOGO.map((c) => (
                  <tr key={c.tipo}>
                    <td className="px-5 py-3">
                      <span className="font-semibold">{c.nome}</span>
                      <span className="block text-xs text-tinta-500">{c.paraQue}</span>
                    </td>
                    <td className="px-5 py-3 text-tinta-600">{c.orgaoGeral}</td>
                    <td className="px-5 py-3 tabular-nums text-tinta-600">{c.validadeDias} dias</td>
                    <td className="px-5 py-3">
                      {c.tipo === 'consolidada' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ok-50 px-2.5 py-1 text-xs font-semibold text-ok-700">
                          <IconeRaio size={13} /> Automática
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-tinta-100 px-2.5 py-1 text-xs font-semibold text-tinta-700">
                          <IconeUpload size={13} /> Assistida ou conector
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Entregas */}
        <section>
          <h2 className="font-display text-3xl font-extrabold tracking-tight">Chega onde você precisa</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              [<IconeEmail key="e" />, 'E-mail semanal', 'Toda segunda às 8h (ou quando você escolher): a situação de cada empresa e os PDFs vigentes em anexo.'],
              [<IconeSino key="s" />, 'Alerta de vencimento', 'Aviso com a antecedência que você define, e de novo a 7 dias, 1 dia e no vencimento. Cada aviso sai uma vez só.'],
              [<IconePasta key="p" />, 'Pasta pronta e link de consulta', 'ZIP com uma pasta por empresa e arquivos nomeados pela validade, e um link só de download para o contador ou o cliente.'],
              [<IconeLink key="l" />, 'Integração com seu sistema', 'Cada certidão nova vai por webhook assinado (HMAC) para o sistema jurídico, ERP ou GED, com os dados e o PDF.'],
            ].map(([icone, t, d], i) => (
              <div key={i} className="flex gap-4 rounded-3xl border border-tinta-200 bg-white p-6 shadow-suave">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-petroleo-50 text-petroleo-700">{icone}</span>
                <div>
                  <h3 className="font-display font-bold">{t}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-tinta-600">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Transparência */}
        <section className="rounded-3xl bg-petroleo-50 p-6 sm:p-10">
          <h2 className="font-display text-2xl font-extrabold tracking-tight">Por que algumas certidões pedem um clique seu?</h2>
          <div className="mt-4 grid gap-6 text-sm leading-relaxed text-tinta-700 md:grid-cols-2">
            <p>
              Nenhuma dessas certidões exige login ou certificado digital: basta o CNPJ. Mas os sites da Receita, Caixa, TST, SEFAZ e prefeituras colocam a
              verificação “não sou um robô” antes de emitir. O CERTA não tenta burlar essa proteção: abre o site oficial certo, com o CNPJ copiado, e lê
              sozinho o PDF que você baixa.
            </p>
            <p>
              A consulta consolidada do TCU (inidôneos, improbidade no CNJ, CEIS e CNEP) tem serviço público aberto e sai 100% automática. Para as demais,
              o CERTA traz pronto o conector de um provedor autorizado (Infosimples): com a chave configurada, Federal, FGTS, Trabalhista e Estadual passam a
              ser emitidas sem clique.
            </p>
          </div>
        </section>

        <section className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-petroleo-900 p-8 text-white sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="font-display text-2xl font-extrabold">Veja funcionando</h2>
            <p className="mt-1 text-petroleo-100">A demonstração tem 8 empresas fictícias com certidões vencendo, vencidas e em dia.</p>
          </div>
          <Comecar claro />
        </section>
      </main>

      <footer className="border-t border-tinta-200 py-8 text-center text-sm text-tinta-500">
        CERTA · projeto de portfólio de{' '}
        <a href="https://enzo-ferrara.vercel.app" className="font-medium text-petroleo-700 hover:underline">
          Enzo Ferrara
        </a>
      </footer>
    </div>
  );
}
