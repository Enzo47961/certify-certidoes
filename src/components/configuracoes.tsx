'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { IconeCopiar, IconeDownload, IconeLink, IconePasta, IconeSino } from './icones';
import { Aviso, Botao, chamar } from './ui';

type Config = {
  nome: string;
  demo: boolean;
  alerta_ativo: boolean;
  alerta_dias: number;
  webhook_url: string | null;
  webhook_segredo: string;
  token_leitura: string;
};

export function Configuracoes({ token, espaco }: { token: string; espaco: Config }) {
  const router = useRouter();
  const [c, setC] = useState(espaco);
  const [origem, setOrigem] = useState('');
  const [retorno, setRetorno] = useState<Record<string, { tom: 'ok' | 'perigo'; texto: string }>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);
  useEffect(() => setOrigem(window.location.origin), []);

  const avisar = (secao: string, tom: 'ok' | 'perigo', texto: string) => setRetorno((r) => ({ ...r, [secao]: { tom, texto } }));

  async function salvar(secao: string, dados: Partial<Config>) {
    setOcupado(secao);
    const r = await chamar(`/api/p/${token}/config`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(dados) });
    setOcupado(null);
    if (r.ok) {
      avisar(secao, 'ok', 'Salvo.');
      router.refresh();
    } else avisar(secao, 'perigo', r.erro);
  }

  async function testar(secao: string) {
    setOcupado(`${secao}-teste`);
    const r = await chamar<{ detalhe: string }>(`/api/p/${token}/testar`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    setOcupado(null);
    avisar(secao, r.ok ? 'ok' : 'perigo', r.ok ? r.dados.detalhe : r.erro);
  }

  const copiar = (texto: string, secao: string) =>
    navigator.clipboard.writeText(texto).then(() => avisar(secao, 'ok', 'Copiado.'), () => undefined);

  const linkLeitura = `${origem}/p/${c.token_leitura}`;
  const bloqueado = c.demo;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Exportar e integrar</h1>
        <p className="mt-1 text-sm text-tinta-500">Como as certidões saem do CERTIFY: pasta, link de consulta e integração com o seu sistema.</p>
      </div>
      {bloqueado ? (
        <Aviso>
          Na demonstração a integração fica desligada (para ninguém disparar envios a sistemas de terceiros). A pasta ZIP e o link de consulta funcionam.
          Crie o seu painel na página inicial para configurar tudo.
        </Aviso>
      ) : null}

      <Secao icone={<IconePasta />} titulo="Pasta e compartilhamento" descricao="Para o servidor de arquivos, o setor de licitações ou o contador.">
        <div className="flex flex-wrap gap-2">
          <a href={`/api/p/${token}/pasta`} className="inline-flex items-center gap-2 rounded-xl bg-petroleo-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-petroleo-700">
            <IconeDownload size={16} /> Baixar pasta (ZIP)
          </a>
        </div>
        <p className="text-xs text-tinta-500">Uma pasta por empresa, arquivos nomeados com o tipo e a validade, e um resumo.csv que abre no Excel.</p>
        <Campo rotulo="Link só de consulta e download (não mostra configurações nem emite)">
          <div className="flex gap-2">
            <input readOnly value={linkLeitura} className={`${entrada} font-mono text-xs`} onFocus={(e) => e.target.select()} />
            <Botao onClick={() => copiar(linkLeitura, 'pasta')}>
              <IconeCopiar size={15} /> Copiar
            </Botao>
          </div>
        </Campo>
        <Retorno r={retorno.pasta} />
      </Secao>

      <Secao icone={<IconeSino />} titulo="Alerta de vencimento" descricao="Define quando uma certidão passa a aparecer como “vencendo” no painel e em Próximos vencimentos.">
        <div className="flex flex-wrap items-end gap-3">
          <Campo rotulo="Avisar com antecedência de">
            <select disabled={bloqueado} value={c.alerta_dias} onChange={(e) => setC({ ...c, alerta_dias: Number(e.target.value) })} className={entrada}>
              {[5, 10, 15, 20, 30, 45, 60].map((d) => <option key={d} value={d}>{d} dias</option>)}
            </select>
          </Campo>
          <Interruptor disabled={bloqueado} ligado={c.alerta_ativo} aoMudar={(v) => setC({ ...c, alerta_ativo: v })}>
            Avisar também a integração
          </Interruptor>
        </div>
        <p className="text-xs text-tinta-500">Com a integração configurada (abaixo), o CERTIFY envia todo dia às 8h o evento <code className="font-mono">certidoes.vencendo</code> com as certidões que entraram na janela, e de novo a 7 dias, 1 dia e no vencimento. Cada aviso sai uma vez só.</p>
        <Botao variante="primario" disabled={bloqueado} carregando={ocupado === 'alerta'} onClick={() => salvar('alerta', { alerta_dias: c.alerta_dias, alerta_ativo: c.alerta_ativo })}>
          Salvar
        </Botao>
        <Retorno r={retorno.alerta} />
      </Secao>

      <Secao icone={<IconeLink />} titulo="Integração com sistema interno" descricao="A cada certidão nova, e nos avisos de vencimento, o CERTIFY envia um POST com os dados (e o PDF) para o seu sistema jurídico, ERP ou GED.">
        <Campo rotulo="Endereço (https) que recebe as certidões">
          <input disabled={bloqueado} value={c.webhook_url ?? ''} onChange={(e) => setC({ ...c, webhook_url: e.target.value })} placeholder="https://sistema.suaempresa.com.br/webhooks/certidoes" className={entrada} />
        </Campo>
        <Campo rotulo="Segredo para conferir a assinatura (X-Certify-Assinatura)">
          <div className="flex gap-2">
            <input readOnly value={c.webhook_segredo} className={`${entrada} font-mono text-xs`} />
            <Botao disabled={bloqueado} onClick={() => copiar(c.webhook_segredo, 'webhook')}>
              <IconeCopiar size={15} />
            </Botao>
          </div>
        </Campo>
        <div className="flex flex-wrap gap-2">
          <Botao variante="primario" disabled={bloqueado} carregando={ocupado === 'webhook'} onClick={() => salvar('webhook', { webhook_url: c.webhook_url ?? '' })}>
            Salvar
          </Botao>
          <Botao disabled={bloqueado || !espaco.webhook_url} carregando={ocupado === 'webhook-teste'} onClick={() => testar('webhook')}>
            Enviar teste
          </Botao>
        </div>
        <Retorno r={retorno.webhook} />
        <details className="rounded-xl bg-tinta-50 p-3 text-sm">
          <summary className="cursor-pointer font-medium">Formato do envio e como conferir a assinatura</summary>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-tinta-900 p-3 text-xs leading-relaxed text-tinta-100">{`POST  Content-Type: application/json
X-Certify-Evento: certidao.emitida
X-Certify-Assinatura: sha256=<hmac>

{
  "evento": "certidao.emitida",
  "enviado_em": "2026-09-28T11:00:02Z",
  "dados": {
    "empresa":  { "cnpj": "…", "razao_social": "…", "uf": "SP" },
    "certidao": { "tipo": "fgts", "resultado": "Negativa · regular",
                  "numero": "…", "emitida_em": "…", "valida_ate": "2026-10-28" },
    "pdf_base64": "JVBERi0xLjcK…"
  }
}

// Todo dia às 8h, se houver certidão entrando na janela de alerta:
X-Certify-Evento: certidoes.vencendo
{ "evento": "certidoes.vencendo", "dados": { "painel": "https://…",
  "certidoes": [ { "empresa": "…", "cnpj": "…", "tipo": "fgts",
                   "valida_ate": "2026-10-05", "dias_para_vencer": 7 } ] } }

// Node.js — conferir que veio do CERTIFY
const esperado = 'sha256=' + crypto.createHmac('sha256', SEGREDO)
  .update(corpoBruto).digest('hex');
if (req.headers['x-certify-assinatura'] !== esperado) return res.status(401).end();`}</pre>
        </details>
      </Secao>
    </div>
  );
}

const entrada = 'w-full rounded-xl border border-tinta-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-petroleo-400 disabled:bg-tinta-50 disabled:text-tinta-400';

function Secao({ icone, titulo, descricao, children }: { icone: ReactNode; titulo: string; descricao: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-tinta-200 bg-white p-5 shadow-suave sm:p-6">
      <div className="flex gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-petroleo-50 text-petroleo-700">{icone}</span>
        <div>
          <h2 className="font-display text-lg font-bold">{titulo}</h2>
          <p className="text-sm text-tinta-500">{descricao}</p>
        </div>
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-tinta-700">{rotulo}</span>
      {children}
    </label>
  );
}

function Interruptor({ ligado, aoMudar, disabled, children }: { ligado: boolean; aoMudar: (v: boolean) => void; disabled?: boolean; children: ReactNode }) {
  return (
    <label className={`flex items-center gap-3 text-sm ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
      <button
        type="button"
        role="switch"
        aria-checked={ligado}
        disabled={disabled}
        onClick={() => aoMudar(!ligado)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${ligado ? 'bg-petroleo-600' : 'bg-tinta-300'}`}
      >
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${ligado ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
      <span>{children}</span>
    </label>
  );
}

function Retorno({ r }: { r?: { tom: 'ok' | 'perigo'; texto: string } }) {
  return r ? <Aviso tom={r.tom}>{r.texto}</Aviso> : null;
}
