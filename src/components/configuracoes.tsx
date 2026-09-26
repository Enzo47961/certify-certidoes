'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { IconeCopiar, IconeDownload, IconeEmail, IconeLink, IconePasta, IconeSino } from './icones';
import { Aviso, Botao, chamar } from './ui';

type Config = {
  nome: string;
  demo: boolean;
  email: string | null;
  rotina_ativa: boolean;
  rotina_dia: number;
  rotina_hora: number;
  alerta_ativo: boolean;
  alerta_dias: number;
  webhook_url: string | null;
  webhook_segredo: string;
  token_leitura: string;
  ultimo_envio: string | null;
};

const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export function Configuracoes({ token, espaco, emailServidor }: { token: string; espaco: Config; emailServidor: boolean }) {
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

  async function testar(secao: string, acao: 'email' | 'webhook') {
    setOcupado(`${secao}-teste`);
    const r = await chamar<{ detalhe: string }>(`/api/p/${token}/testar`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ acao }) });
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
        <h1 className="font-display text-2xl font-extrabold">Entregas e alertas</h1>
        <p className="mt-1 text-sm text-tinta-500">Como as certidões chegam até você e quem mais precisa delas.</p>
      </div>
      {bloqueado ? (
        <Aviso>
          Na demonstração, e-mail e integração ficam desligados (para ninguém disparar mensagens a terceiros). A pasta ZIP e o link de consulta funcionam.
          Crie o seu painel na página inicial para configurar tudo.
        </Aviso>
      ) : null}

      <Secao icone={<IconeEmail />} titulo="E-mail semanal com as certidões" descricao="Um resumo da situação de cada empresa, com os PDFs vigentes anexados, no dia e hora que você escolher.">
        {!emailServidor && !bloqueado ? <Aviso tom="perigo">O envio de e-mail ainda não foi configurado neste servidor (chave do Resend).</Aviso> : null}
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <Campo rotulo="Enviar para">
            <input type="email" disabled={bloqueado} value={c.email ?? ''} onChange={(e) => setC({ ...c, email: e.target.value })} placeholder="financeiro@suaempresa.com.br" className={entrada} />
          </Campo>
          <Campo rotulo="Dia">
            <select disabled={bloqueado} value={c.rotina_dia} onChange={(e) => setC({ ...c, rotina_dia: Number(e.target.value) })} className={entrada}>
              {DIAS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Horário">
            <select disabled={bloqueado} value={c.rotina_hora} onChange={(e) => setC({ ...c, rotina_hora: Number(e.target.value) })} className={entrada}>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
            </select>
          </Campo>
        </div>
        <Interruptor disabled={bloqueado} ligado={c.rotina_ativa} aoMudar={(v) => setC({ ...c, rotina_ativa: v })}>
          Enviar toda {DIAS[c.rotina_dia].toLowerCase()} às {String(c.rotina_hora).padStart(2, '0')}h (horário de Brasília)
        </Interruptor>
        {c.ultimo_envio ? <p className="text-xs text-tinta-500">Último envio: {new Date(c.ultimo_envio).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Botao variante="primario" disabled={bloqueado} carregando={ocupado === 'email'} onClick={() => salvar('email', { email: c.email ?? '', rotina_ativa: c.rotina_ativa, rotina_dia: c.rotina_dia, rotina_hora: c.rotina_hora })}>
            Salvar
          </Botao>
          <Botao disabled={bloqueado || !espaco.email} carregando={ocupado === 'email-teste'} onClick={() => testar('email', 'email')}>
            Enviar agora
          </Botao>
        </div>
        <Retorno r={retorno.email} />
      </Secao>

      <Secao icone={<IconeSino />} titulo="Alerta de vencimento" descricao="E-mail quando uma certidão entra na janela de renovação, e de novo a 7 dias, 1 dia e no vencimento. Cada aviso sai uma vez só.">
        <div className="flex flex-wrap items-end gap-3">
          <Campo rotulo="Avisar com antecedência de">
            <select disabled={bloqueado} value={c.alerta_dias} onChange={(e) => setC({ ...c, alerta_dias: Number(e.target.value) })} className={entrada}>
              {[5, 10, 15, 20, 30, 45, 60].map((d) => <option key={d} value={d}>{d} dias</option>)}
            </select>
          </Campo>
          <Interruptor disabled={bloqueado} ligado={c.alerta_ativo} aoMudar={(v) => setC({ ...c, alerta_ativo: v })}>
            Alertas ligados
          </Interruptor>
        </div>
        <p className="text-xs text-tinta-500">Os alertas vão para o mesmo e-mail do resumo, no horário escolhido acima. A janela também define o que aparece como “vencendo” no painel.</p>
        <Botao variante="primario" disabled={bloqueado} carregando={ocupado === 'alerta'} onClick={() => salvar('alerta', { alerta_dias: c.alerta_dias, alerta_ativo: c.alerta_ativo })}>
          Salvar
        </Botao>
        <Retorno r={retorno.alerta} />
      </Secao>

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

      <Secao icone={<IconeLink />} titulo="Integração com sistema interno" descricao="A cada certidão nova, o CERTA envia um POST com os dados e o PDF para o seu sistema jurídico, ERP ou GED.">
        <Campo rotulo="Endereço (https) que recebe as certidões">
          <input disabled={bloqueado} value={c.webhook_url ?? ''} onChange={(e) => setC({ ...c, webhook_url: e.target.value })} placeholder="https://sistema.suaempresa.com.br/webhooks/certidoes" className={entrada} />
        </Campo>
        <Campo rotulo="Segredo para conferir a assinatura (X-Certa-Assinatura)">
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
          <Botao disabled={bloqueado || !espaco.webhook_url} carregando={ocupado === 'webhook-teste'} onClick={() => testar('webhook', 'webhook')}>
            Enviar teste
          </Botao>
        </div>
        <Retorno r={retorno.webhook} />
        <details className="rounded-xl bg-tinta-50 p-3 text-sm">
          <summary className="cursor-pointer font-medium">Formato do envio e como conferir a assinatura</summary>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-tinta-900 p-3 text-xs leading-relaxed text-tinta-100">{`POST  Content-Type: application/json
X-Certa-Evento: certidao.emitida
X-Certa-Assinatura: sha256=<hmac>

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

// Node.js — conferir que veio do CERTA
const esperado = 'sha256=' + crypto.createHmac('sha256', SEGREDO)
  .update(corpoBruto).digest('hex');
if (req.headers['x-certa-assinatura'] !== esperado) return res.status(401).end();`}</pre>
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
