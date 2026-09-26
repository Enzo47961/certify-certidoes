'use client';

import { useEffect, useRef, useState } from 'react';
import { CATALOGO, INFO, type Rota, type TipoCertidao } from '@/lib/catalogo';
import { formatarCnpj } from '@/lib/cnpj';
import { ROTULO_RESULTADO, dataBr, estadoDa, prazoTexto, type CertidaoResumo } from '@/lib/situacao';
import { IconeCopiar, IconeDownload, IconeExterno, IconeFechar, IconeLixo, IconeOlho, IconeRaio, IconeUpload } from './icones';
import type { EmpresaPainel, EspacoPainel } from './painel';
import { Aviso, Botao, EtiquetaEstado, Gaveta, chamar } from './ui';

const ORIGEM: Record<string, string> = {
  demo: 'Exemplo da demonstração',
  tcu: 'Emitida no serviço oficial do TCU',
  infosimples: 'Emitida automaticamente (Infosimples)',
  envio: 'PDF oficial enviado e lido',
};

export function GavetaEmpresa({
  espaco,
  empresa,
  rotas,
  foco,
  aoFechar,
  aoMudar,
}: {
  espaco: EspacoPainel;
  empresa: EmpresaPainel;
  rotas: Record<TipoCertidao, Rota>;
  foco?: TipoCertidao;
  aoFechar: () => void;
  aoMudar: () => void;
}) {
  const [historico, setHistorico] = useState<CertidaoResumo[] | null>(null);
  const [removendo, setRemovendo] = useState(false);
  const refs = useRef<Partial<Record<TipoCertidao, HTMLElement | null>>>({});

  const recarregarHistorico = () =>
    chamar<CertidaoResumo[]>(`/api/p/${espaco.token}/empresas/${empresa.id}`).then((r) => r.ok && setHistorico(r.dados));

  useEffect(() => {
    recarregarHistorico();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresa.certidoes]);

  useEffect(() => {
    if (foco) refs.current[foco]?.scrollIntoView({ block: 'center' });
  }, [foco]);

  async function remover() {
    const r = await chamar(`/api/p/${espaco.token}/empresas/${empresa.id}`, { method: 'DELETE' });
    if (r.ok) {
      aoFechar();
      aoMudar();
    }
  }

  return (
    <Gaveta aberta aoFechar={aoFechar} rotulo={empresa.razao_social}>
      <header className="sticky top-0 z-10 border-b border-tinta-200 bg-papel/95 px-5 py-4 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-extrabold leading-tight text-tinta-900">{empresa.razao_social}</h2>
            <p className="mt-0.5 text-sm text-tinta-500">
              {formatarCnpj(empresa.cnpj)} · {empresa.municipio ?? '—'}/{empresa.uf ?? '—'}
            </p>
          </div>
          <button type="button" onClick={aoFechar} aria-label="Fechar" className="rounded-lg p-1.5 text-tinta-500 hover:bg-tinta-100 hover:text-tinta-900">
            <IconeFechar />
          </button>
        </div>
      </header>

      <div className="space-y-3 p-5">
        {CATALOGO.map((info) => (
          <CartaoCertidao
            key={info.tipo}
            ref={(el) => {
              refs.current[info.tipo] = el;
            }}
            destaque={foco === info.tipo}
            espaco={espaco}
            empresa={empresa}
            tipo={info.tipo}
            rota={rotas[info.tipo]}
            certidao={empresa.certidoes.find((c) => c.tipo === info.tipo)}
            aoMudar={aoMudar}
          />
        ))}

        <section className="rounded-2xl border border-tinta-200 bg-white p-4">
          <h3 className="font-display font-bold">Histórico de emissões</h3>
          {!historico ? (
            <p className="mt-2 text-sm text-tinta-500">Carregando…</p>
          ) : historico.length === 0 ? (
            <p className="mt-2 text-sm text-tinta-500">Nenhuma certidão emitida ainda.</p>
          ) : (
            <ul className="mt-2 divide-y divide-tinta-100 text-sm">
              {historico.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    <span className="font-medium">{INFO[c.tipo as TipoCertidao]?.nome ?? c.tipo}</span>
                    <span className="text-tinta-500"> · emitida {dataBr(c.emitida_em)} · válida até {dataBr(c.valida_ate)}</span>
                  </span>
                  {c.tem_arquivo ? (
                    <a href={`/api/p/${espaco.token}/arquivo/${c.id}`} target="_blank" rel="noreferrer" className="shrink-0 text-petroleo-700 hover:underline">
                      PDF
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {!espaco.demo ? (
          <div className="pt-2 text-right">
            {removendo ? (
              <span className="inline-flex items-center gap-2 text-sm">
                Remover a empresa e todo o histórico?
                <Botao tamanho="sm" variante="fantasma" onClick={() => setRemovendo(false)}>Não</Botao>
                <Botao tamanho="sm" variante="perigo" onClick={remover}>Remover</Botao>
              </span>
            ) : (
              <Botao tamanho="sm" variante="fantasma" onClick={() => setRemovendo(true)}>
                <IconeLixo size={15} /> Remover empresa
              </Botao>
            )}
          </div>
        ) : null}
      </div>
    </Gaveta>
  );
}

function CartaoCertidao({
  ref,
  destaque,
  espaco,
  empresa,
  tipo,
  rota,
  certidao,
  aoMudar,
}: {
  ref: (el: HTMLElement | null) => void;
  destaque: boolean;
  espaco: EspacoPainel;
  empresa: EmpresaPainel;
  tipo: TipoCertidao;
  rota: Rota;
  certidao?: CertidaoResumo;
  aoMudar: () => void;
}) {
  const info = INFO[tipo];
  const { estado, dias } = estadoDa(certidao, espaco.alerta_dias);
  const [vendo, setVendo] = useState(false);
  const [ocupado, setOcupado] = useState<'emitir' | 'enviar' | null>(null);
  const [retorno, setRetorno] = useState<{ tom: 'ok' | 'perigo' | 'aviso'; texto: string; confirmar?: File } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const link = info.link(empresa);
  const automatica = rota !== 'assistida';
  const estimada = Boolean(certidao?.detalhes?.validade_estimada);

  async function emitir() {
    setOcupado('emitir');
    setRetorno(null);
    const r = await chamar<{ resultados: Array<{ emissao: { status: string; motivo?: string } }> }>(`/api/p/${espaco.token}/emitir`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ empresaId: empresa.id, tipos: [tipo] }),
    });
    setOcupado(null);
    const e = r.ok ? r.dados.resultados[0]?.emissao : null;
    if (!r.ok) setRetorno({ tom: 'perigo', texto: r.erro });
    else if (e?.status === 'recente') setRetorno({ tom: 'ok', texto: e.motivo ?? 'Já emitida hoje.' });
    else if (e?.status === 'assistida') setRetorno({ tom: 'aviso', texto: e.motivo ?? 'Emita no site oficial e envie o PDF.' });
    else if (e?.status === 'emitida') {
      setRetorno({ tom: 'ok', texto: 'Certidão emitida e guardada.' });
      aoMudar();
    } else setRetorno({ tom: 'perigo', texto: e?.motivo ?? 'O órgão não respondeu.' });
  }

  async function enviar(arquivo: File, confirmar = false) {
    setOcupado('enviar');
    setRetorno(null);
    const form = new FormData();
    form.set('empresaId', empresa.id);
    form.set('tipo', tipo);
    form.set('arquivo', arquivo);
    if (confirmar) form.set('confirmar', '1');
    const r = await chamar<{ avisos: string[] }>(`/api/p/${espaco.token}/enviar`, { method: 'POST', body: form });
    setOcupado(null);
    if (entrada.current) entrada.current.value = '';
    if (r.ok) {
      setRetorno({ tom: r.dados.avisos.length ? 'aviso' : 'ok', texto: r.dados.avisos.length ? `Guardada. ${r.dados.avisos.join(' ')}` : 'PDF lido e guardado: validade e número conferidos.' });
      aoMudar();
    } else setRetorno({ tom: 'perigo', texto: r.erro, confirmar: r.extra.precisaConfirmar ? arquivo : undefined });
  }

  async function copiarCnpj() {
    try {
      await navigator.clipboard.writeText(empresa.cnpj);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      /* sem permissão: o CNPJ está visível no topo */
    }
  }

  return (
    <article ref={ref} className={`rounded-2xl border bg-white p-4 transition ${destaque ? 'border-petroleo-400 ring-2 ring-petroleo-100' : 'border-tinta-200'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display font-bold text-tinta-900">{info.nome}</h3>
          <p className="text-xs text-tinta-500">{info.orgao(empresa)}</p>
        </div>
        <div className="text-right">
          <EtiquetaEstado estado={estado} />
          {certidao ? <p className="mt-1 text-xs text-tinta-500">{prazoTexto(dias)}</p> : null}
        </div>
      </div>

      {certidao ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-tinta-50 p-3 text-sm sm:grid-cols-4">
          <div className="col-span-2">
            <dt className="text-xs text-tinta-500">Resultado</dt>
            <dd className="font-medium">{(certidao.detalhes?.rotulo as string) || ROTULO_RESULTADO[certidao.situacao] || certidao.situacao}</dd>
          </div>
          <div>
            <dt className="text-xs text-tinta-500">Emitida</dt>
            <dd className="font-medium tabular-nums">{dataBr(certidao.emitida_em)}</dd>
          </div>
          <div>
            <dt className="text-xs text-tinta-500">Válida até</dt>
            <dd className="font-medium tabular-nums">
              {dataBr(certidao.valida_ate)}
              {estimada ? <span className="ml-1 text-[11px] font-normal text-tinta-500" title={`O órgão não imprime validade; considerado o prazo usual de ${info.validadeDias} dias.`}>(usual)</span> : null}
            </dd>
          </div>
          {certidao.numero ? (
            <div className="col-span-2 sm:col-span-4">
              <dt className="text-xs text-tinta-500">Número / código de controle</dt>
              <dd className="break-all font-mono text-xs">{certidao.numero}</dd>
            </div>
          ) : null}
          <div className="col-span-2 sm:col-span-4 text-xs text-tinta-500">{ORIGEM[certidao.origem] ?? certidao.origem}</div>
        </dl>
      ) : (
        <p className="mt-2 text-sm text-tinta-500">{info.paraQue}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {certidao?.tem_arquivo ? (
          <>
            <Botao tamanho="sm" onClick={() => setVendo((v) => !v)}>
              <IconeOlho size={15} /> {vendo ? 'Fechar PDF' : 'Ver PDF'}
            </Botao>
            <a href={`/api/p/${espaco.token}/arquivo/${certidao.id}?baixar=1`} className="inline-flex items-center gap-2 rounded-xl border border-tinta-200 px-3 py-1.5 text-sm font-medium hover:bg-tinta-50">
              <IconeDownload size={15} /> Baixar
            </a>
          </>
        ) : null}
        {automatica ? (
          <Botao tamanho="sm" variante="primario" onClick={emitir} carregando={ocupado === 'emitir'}>
            <IconeRaio size={15} /> {certidao ? 'Emitir de novo' : 'Emitir agora'}
          </Botao>
        ) : null}
      </div>

      {!automatica ? (
        <div className="mt-3 rounded-xl border border-dashed border-tinta-300 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-tinta-500">Emissão assistida · 2 passos</p>
          <ol className="mt-2 space-y-2 text-sm">
            <li className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-petroleo-700">1.</span>
              <a href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-petroleo-700 underline-offset-2 hover:underline">
                {link.exato ? `Abrir o site oficial (${info.orgao(empresa)})` : `Encontrar o site oficial (${info.orgao(empresa)})`} <IconeExterno size={14} />
              </a>
              <button type="button" onClick={copiarCnpj} className="inline-flex items-center gap-1 rounded-lg bg-tinta-100 px-2 py-1 text-xs text-tinta-700 hover:bg-tinta-200">
                <IconeCopiar size={13} /> {copiado ? 'CNPJ copiado' : 'Copiar CNPJ'}
              </button>
            </li>
            <li className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-petroleo-700">2.</span>
              <span>Envie o PDF baixado — o CERTIFY lê resultado, número e validade:</span>
              <Botao tamanho="sm" onClick={() => entrada.current?.click()} carregando={ocupado === 'enviar'}>
                <IconeUpload size={15} /> Enviar PDF
              </Botao>
            </li>
          </ol>
        </div>
      ) : !espaco.demo ? (
        <p className="mt-2 text-xs text-tinta-500">
          Tem o PDF oficial em mãos?{' '}
          <button type="button" onClick={() => entrada.current?.click()} className="font-medium text-petroleo-700 hover:underline">
            Enviar arquivo
          </button>
        </p>
      ) : null}
      <input ref={entrada} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => e.target.files?.[0] && enviar(e.target.files[0])} />

      {retorno ? (
        <div className="mt-3">
          <Aviso tom={retorno.tom}>
            {retorno.texto}
            {retorno.confirmar ? (
              <button type="button" onClick={() => enviar(retorno.confirmar!, true)} className="ml-2 font-semibold underline">
                Guardar mesmo assim
              </button>
            ) : null}
          </Aviso>
        </div>
      ) : null}

      {vendo && certidao ? (
        <iframe title={`PDF da certidão ${info.nome}`} src={`/api/p/${espaco.token}/arquivo/${certidao.id}`} className="mt-3 h-[540px] w-full rounded-xl border border-tinta-200 bg-tinta-50" />
      ) : null}
    </article>
  );
}
