'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CATALOGO, INFO, TIPOS, type Rota, type TipoCertidao } from '@/lib/catalogo';
import { formatarCnpj } from '@/lib/cnpj';
import { dataBr, estadoDa, prazoTexto, type CertidaoResumo, type Estado } from '@/lib/situacao';
import { AdicionarEmpresa } from './adicionar-empresa';
import { GavetaEmpresa } from './gaveta-empresa';
import { IconeAlerta, IconeBusca, IconeCheck, IconeDownload, IconeMais, IconeRaio, IconeRelogio, IconeSelo } from './icones';
import { Aviso, Botao, ESTILO_ESTADO, EtiquetaEstado, chamar } from './ui';

export type EmpresaPainel = {
  id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string | null;
  uf?: string | null;
  municipio?: string | null;
  certidoes: CertidaoResumo[];
};

export type EspacoPainel = { token: string; token_leitura: string; nome: string; demo: boolean; alerta_dias: number };
export type EventoPainel = { id: number; tipo: string; status: 'ok' | 'erro' | 'info'; detalhe: string | null; criado_em: string };

type Filtro = 'todas' | 'atencao' | 'vencidas' | 'pendentes';

export function Painel({
  espaco,
  empresas,
  eventos,
  rotas,
}: {
  espaco: EspacoPainel;
  empresas: EmpresaPainel[];
  eventos: EventoPainel[];
  rotas: Record<string, Record<TipoCertidao, Rota>>;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [uf, setUf] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [adicionando, setAdicionando] = useState(false);
  const [aberta, setAberta] = useState<{ empresaId: string; tipo?: TipoCertidao } | null>(null);
  const [lote, setLote] = useState<{ feitas: number; total: number } | null>(null);
  const [mensagem, setMensagem] = useState<{ tom: 'ok' | 'perigo'; texto: string } | null>(null);

  // Guarda os painéis abertos neste navegador (para achar o link de novo na página inicial).
  useEffect(() => {
    if (espaco.demo) return;
    try {
      const lista = JSON.parse(localStorage.getItem('certify:paineis') ?? '[]') as Array<{ token: string; nome: string }>;
      const nova = [{ token: espaco.token, nome: espaco.nome }, ...lista.filter((p) => p.token !== espaco.token)].slice(0, 5);
      localStorage.setItem('certify:paineis', JSON.stringify(nova));
    } catch {
      /* armazenamento bloqueado: segue sem lembrar */
    }
  }, [espaco.demo, espaco.nome, espaco.token]);

  const estados = useMemo(
    () =>
      Object.fromEntries(
        empresas.map((e) => [e.id, Object.fromEntries(TIPOS.map((t) => [t, estadoDa(e.certidoes.find((c) => c.tipo === t), espaco.alerta_dias)]))]),
      ) as Record<string, Record<TipoCertidao, { estado: Estado; dias: number | null }>>,
    [empresas, espaco.alerta_dias],
  );

  const contagem = useMemo(() => {
    const c = { valida: 0, vencendo: 0, vencida: 0, irregular: 0, pendente: 0 };
    for (const e of empresas) for (const t of TIPOS) c[estados[e.id][t].estado]++;
    return c;
  }, [empresas, estados]);

  const ufs = useMemo(() => [...new Set(empresas.map((e) => e.uf).filter(Boolean) as string[])].sort(), [empresas]);

  const visiveis = empresas.filter((e) => {
    const termo = busca.trim().toLowerCase();
    if (termo && !`${e.razao_social} ${e.nome_fantasia ?? ''} ${e.cnpj} ${formatarCnpj(e.cnpj)}`.toLowerCase().includes(termo)) return false;
    if (uf && e.uf !== uf) return false;
    const st = TIPOS.map((t) => estados[e.id][t].estado);
    if (filtro === 'atencao') return st.some((s) => s !== 'valida');
    if (filtro === 'vencidas') return st.some((s) => s === 'vencida' || s === 'irregular');
    if (filtro === 'pendentes') return st.some((s) => s === 'pendente');
    return true;
  });

  const proximos = empresas
    .flatMap((e) => e.certidoes.map((c) => ({ e, c, ...estados[e.id][c.tipo as TipoCertidao] })))
    .filter((x) => x.dias !== null && x.dias <= 30)
    .sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0))
    .slice(0, 8);

  /** Renova tudo o que sai automaticamente (na demo, todas as certidões). */
  async function atualizarTodas() {
    const alvos = visiveis
      .map((e) => ({ e, tipos: TIPOS.filter((t) => rotas[e.id]?.[t] !== 'assistida' && estados[e.id][t].estado !== 'valida') }))
      .filter((x) => x.tipos.length > 0);
    if (alvos.length === 0) {
      setMensagem({ tom: 'ok', texto: 'Tudo o que sai automaticamente já está válido.' });
      return;
    }
    setMensagem(null);
    setLote({ feitas: 0, total: alvos.length });
    let emitidas = 0;
    for (const [i, { e, tipos }] of alvos.entries()) {
      const r = await chamar<{ resultados: Array<{ emissao: { status: string } }> }>(`/api/p/${espaco.token}/emitir`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ empresaId: e.id, tipos }),
      });
      if (!r.ok) {
        setMensagem({ tom: 'perigo', texto: r.erro });
        break;
      }
      emitidas += r.dados.resultados.filter((x) => x.emissao.status === 'emitida').length;
      setLote({ feitas: i + 1, total: alvos.length });
    }
    setLote(null);
    setMensagem((m) => m ?? { tom: 'ok', texto: `${emitidas} certidão(ões) emitida(s) e guardada(s) no painel.` });
    router.refresh();
  }

  const empresaAberta = aberta ? empresas.find((e) => e.id === aberta.empresaId) : undefined;
  const assistidas = !espaco.demo && TIPOS.some((t) => empresas.some((e) => rotas[e.id]?.[t] === 'assistida'));

  return (
    <div className="space-y-6">
      {/* Indicadores */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumo">
        <Indicador titulo="Empresas" valor={empresas.length} detalhe={`${empresas.length * TIPOS.length} certidões acompanhadas`} />
        <Indicador titulo="Válidas" valor={contagem.valida} detalhe="em dia" estado="valida" />
        <Indicador titulo={`Vencem em até ${espaco.alerta_dias} dias`} valor={contagem.vencendo} detalhe="renovar logo" estado="vencendo" />
        <Indicador titulo="Vencidas ou com pendência" valor={contagem.vencida + contagem.irregular} detalhe={`${contagem.pendente} ainda não emitida(s)`} estado="vencida" />
      </section>

      {espaco.demo ? (
        <Aviso>
          <strong>Demonstração</strong> com um escritório de contabilidade e empresas fictícias. Tudo funciona: emitir, ver o PDF, baixar a pasta, filtrar.
          As certidões daqui são exemplos sem valor legal. <Link href="/" className="font-semibold underline underline-offset-2">Crie o seu painel</Link> para emitir a consulta do TCU de verdade e acompanhar as suas empresas.
        </Aviso>
      ) : null}
      {mensagem ? <Aviso tom={mensagem.tom}>{mensagem.texto}</Aviso> : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <section className="min-w-0 rounded-3xl border border-tinta-200 bg-white shadow-suave">
          {/* Barra de ferramentas */}
          <div className="flex flex-wrap items-center gap-2 border-b border-tinta-100 p-4">
            <label className="relative min-w-52 flex-1">
              <span className="sr-only">Buscar empresa</span>
              <IconeBusca size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou CNPJ"
                className="w-full rounded-xl border border-tinta-200 bg-tinta-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-petroleo-400 focus:bg-white"
              />
            </label>
            <select
              value={uf}
              onChange={(e) => setUf(e.target.value)}
              aria-label="Filtrar por estado"
              className="rounded-xl border border-tinta-200 bg-white px-3 py-2 text-sm text-tinta-700 outline-none focus:border-petroleo-400"
            >
              <option value="">Todos os estados</option>
              {ufs.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <div className="flex rounded-xl bg-tinta-100 p-0.5 text-sm" role="group" aria-label="Filtrar por situação">
              {(
                [
                  ['todas', 'Todas'],
                  ['atencao', 'Atenção'],
                  ['vencidas', 'Vencidas'],
                  ['pendentes', 'Não emitidas'],
                ] as const
              ).map(([id, rotulo]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={filtro === id}
                  onClick={() => setFiltro(id)}
                  className={`rounded-lg px-3 py-1.5 font-medium transition ${filtro === id ? 'bg-white text-tinta-900 shadow-suave' : 'text-tinta-500 hover:text-tinta-800'}`}
                >
                  {rotulo}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div className="text-sm text-tinta-500">
              <p>
                {visiveis.length} de {empresas.length} empresa(s)
              </p>
              <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                {(
                  [
                    ['valida', 'válida até a data'],
                    ['vencendo', 'dias para vencer'],
                    ['vencida', 'vencida ou com pendência'],
                    ['pendente', 'não emitida'],
                  ] as const
                ).map(([e, t]) => (
                  <span key={e} className="inline-flex items-center gap-1">
                    <span className={`size-1.5 rounded-full ${ESTILO_ESTADO[e].ponto}`} /> {t}
                  </span>
                ))}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Botao tamanho="sm" onClick={atualizarTodas} carregando={Boolean(lote)} disabled={empresas.length === 0}>
                {lote ? `Emitindo ${lote.feitas}/${lote.total}…` : (<><IconeRaio size={15} /> Atualizar vencidas e pendentes</>)}
              </Botao>
              <a
                href={`/api/p/${espaco.token}/pasta`}
                className="inline-flex items-center gap-2 rounded-xl border border-tinta-200 bg-white px-3 py-1.5 text-sm font-medium text-tinta-800 transition hover:border-tinta-300 hover:bg-tinta-50"
              >
                <IconeDownload size={15} /> Baixar pasta (ZIP)
              </a>
              <Botao tamanho="sm" variante="primario" onClick={() => setAdicionando(true)}>
                <IconeMais size={15} /> Adicionar empresa
              </Botao>
            </div>
          </div>

          {empresas.length === 0 ? (
            <div className="px-6 pb-12 pt-6 text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-petroleo-50 text-petroleo-700">
                <IconeSelo size={28} />
              </span>
              <h3 className="mt-4 font-display text-lg font-bold">Adicione a primeira empresa</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-tinta-500">
                Informe o CNPJ: o CERTIFY busca a razão social, a UF e o município na Receita e já emite o que for automático.
              </p>
              <Botao variante="primario" className="mt-5" onClick={() => setAdicionando(true)}>
                <IconeMais size={16} /> Adicionar empresa
              </Botao>
            </div>
          ) : visiveis.length === 0 ? (
            <p className="px-6 pb-10 pt-4 text-center text-sm text-tinta-500">Nenhuma empresa com esse filtro.</p>
          ) : (
            <>
              {/* Tabela (telas largas) */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead>
                    <tr className="border-y border-tinta-100 bg-tinta-50/60 text-xs uppercase tracking-wide text-tinta-500">
                      <th className="px-4 py-2.5 font-semibold">Empresa</th>
                      {CATALOGO.map((c) => (
                        <th key={c.tipo} className="px-2 py-2.5 font-semibold" title={c.nomeCompleto}>
                          {c.nome}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visiveis.map((e) => (
                      <tr key={e.id} className="border-b border-tinta-100 last:border-0 hover:bg-tinta-50/50">
                        <td className="max-w-64 px-4 py-3">
                          <button type="button" onClick={() => setAberta({ empresaId: e.id })} className="group text-left">
                            <span className="block truncate font-semibold text-tinta-900 group-hover:text-petroleo-700">{e.nome_fantasia || e.razao_social}</span>
                            <span className="block text-xs text-tinta-500">
                              {formatarCnpj(e.cnpj)} · {e.uf ?? '—'}
                            </span>
                          </button>
                        </td>
                        {TIPOS.map((t) => {
                          const { estado, dias } = estados[e.id][t];
                          const c = e.certidoes.find((x) => x.tipo === t);
                          return (
                            <td key={t} className="px-1.5 py-2">
                              <button
                                type="button"
                                onClick={() => setAberta({ empresaId: e.id, tipo: t })}
                                className={`w-full rounded-lg px-2 py-1.5 text-left transition hover:bg-white hover:shadow-suave`}
                                aria-label={`${INFO[t].nome} de ${e.razao_social}: ${estado}`}
                              >
                                <Celula estado={estado} dias={dias} validaAte={c?.valida_ate} />
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cartões (celular) */}
              <ul className="space-y-3 p-4 md:hidden">
                {visiveis.map((e) => (
                  <li key={e.id} className="rounded-2xl border border-tinta-200 p-4">
                    <button type="button" onClick={() => setAberta({ empresaId: e.id })} className="text-left">
                      <span className="block font-semibold">{e.nome_fantasia || e.razao_social}</span>
                      <span className="text-xs text-tinta-500">
                        {formatarCnpj(e.cnpj)} · {e.uf ?? '—'}
                      </span>
                    </button>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {TIPOS.map((t) => {
                        const { estado, dias } = estados[e.id][t];
                        return (
                          <button key={t} type="button" onClick={() => setAberta({ empresaId: e.id, tipo: t })} className="rounded-xl bg-tinta-50 p-2 text-left">
                            <span className="block text-[11px] font-semibold uppercase tracking-wide text-tinta-500">{INFO[t].nome}</span>
                            <Celula estado={estado} dias={dias} validaAte={e.certidoes.find((x) => x.tipo === t)?.valida_ate} />
                          </button>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
          {assistidas ? (
            <p className="border-t border-tinta-100 px-4 py-3 text-xs text-tinta-500">
              Federal, FGTS, Trabalhista, Estadual, Municipal e Falência exigem “não sou um robô” nos sites oficiais: clique na certidão, emita no site e
              envie o PDF. O CERTIFY lê a validade sozinho. Com o conector Infosimples ligado, elas passam a sair automaticamente.
            </p>
          ) : null}
        </section>

        {/* Lateral */}
        <aside className="space-y-6">
          <section className="rounded-3xl border border-tinta-200 bg-white p-5 shadow-suave">
            <h2 className="flex items-center gap-2 font-display font-bold">
              <IconeRelogio size={17} className="text-petroleo-600" /> Próximos vencimentos
            </h2>
            {proximos.length === 0 ? (
              <p className="mt-3 text-sm text-tinta-500">Nada vence nos próximos 30 dias.</p>
            ) : (
              <ul className="mt-3 space-y-1">
                {proximos.map(({ e, c, estado, dias }) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => setAberta({ empresaId: e.id, tipo: c.tipo as TipoCertidao })} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-tinta-50">
                      <span className={`size-2 shrink-0 rounded-full ${ESTILO_ESTADO[estado].ponto}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{e.nome_fantasia || e.razao_social}</span>
                        <span className="text-xs text-tinta-500">{INFO[c.tipo as TipoCertidao]?.nome} · {dataBr(c.valida_ate)}</span>
                      </span>
                      <span className={`shrink-0 text-xs font-semibold ${ESTILO_ESTADO[estado].texto}`}>{prazoTexto(dias).replace('vence ', '')}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-3xl border border-tinta-200 bg-white p-5 shadow-suave">
            <h2 className="font-display font-bold">Atividade</h2>
            {eventos.length === 0 ? (
              <p className="mt-3 text-sm text-tinta-500">As emissões, envios e alertas aparecem aqui.</p>
            ) : (
              <ol className="mt-3 space-y-3">
                {eventos.slice(0, 8).map((ev) => (
                  <li key={ev.id} className="flex gap-2.5 text-sm">
                    <span className={`mt-0.5 shrink-0 ${ev.status === 'erro' ? 'text-perigo-600' : ev.status === 'ok' ? 'text-ok-600' : 'text-tinta-400'}`}>
                      {ev.status === 'erro' ? <IconeAlerta size={15} /> : <IconeCheck size={15} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block leading-snug text-tinta-700">{ev.detalhe}</span>
                      <span className="text-xs text-tinta-400">{new Date(ev.criado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>

      <AdicionarEmpresa aberto={adicionando} aoFechar={() => setAdicionando(false)} token={espaco.token} demo={espaco.demo} aoAdicionar={(id) => { setAdicionando(false); router.refresh(); setAberta({ empresaId: id }); }} />
      {empresaAberta ? (
        <GavetaEmpresa
          key={empresaAberta.id}
          espaco={espaco}
          empresa={empresaAberta}
          rotas={rotas[empresaAberta.id]}
          foco={aberta?.tipo}
          aoFechar={() => setAberta(null)}
          aoMudar={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}

function Indicador({ titulo, valor, detalhe, estado }: { titulo: string; valor: number; detalhe: string; estado?: Estado }) {
  return (
    <div className="rounded-2xl border border-tinta-200 bg-white p-4 shadow-suave">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-tinta-500">
        {estado ? <span className={`size-2 rounded-full ${ESTILO_ESTADO[estado].ponto}`} /> : null}
        {titulo}
      </p>
      <p className="mt-2 font-display text-3xl font-extrabold tabular-nums text-tinta-900">{valor}</p>
      <p className="text-xs text-tinta-500">{detalhe}</p>
    </div>
  );
}

function Celula({ estado, dias, validaAte }: { estado: Estado; dias: number | null; validaAte?: string | null }) {
  const texto =
    estado === 'pendente'
      ? 'Pendente'
      : estado === 'irregular'
        ? 'Pendências'
        : estado === 'vencida'
          ? 'Vencida'
          : estado === 'vencendo'
            ? dias === 0 ? 'Vence hoje' : `${dias} dia${dias === 1 ? '' : 's'}`
            : dataBr(validaAte).slice(0, 5);
  return <EtiquetaEstado estado={estado} texto={texto} compacta />;
}
