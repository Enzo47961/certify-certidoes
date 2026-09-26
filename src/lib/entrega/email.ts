import 'server-only';
import { INFO, type TipoCertidao } from '../catalogo';
import { formatarCnpj } from '../cnpj';
import type { CertidaoComArquivo, EmpresaComCertidoes, Espaco } from '../dados';
import { ROTULO_ESTADO, dataBr, estadoDa, prazoTexto } from '../situacao';

/** E-mail via Resend (https://resend.com). Sem RESEND_API_KEY, explica o que falta. */
export const emailConfigurado = () => Boolean(process.env.RESEND_API_KEY);

type Anexo = { filename: string; content: string };

export async function enviarEmail(para: string, assunto: string, html: string, anexos: Anexo[] = []): Promise<{ ok: boolean; detalhe: string }> {
  if (!emailConfigurado()) return { ok: false, detalhe: 'Envio de e-mail não configurado no servidor (RESEND_API_KEY).' };
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_REMETENTE ?? 'CERTA <onboarding@resend.dev>', to: [para], subject: assunto, html, attachments: anexos }),
      signal: AbortSignal.timeout(30_000),
    });
    const j = (await r.json().catch(() => ({}))) as { message?: string };
    return r.ok ? { ok: true, detalhe: `Enviado para ${para}.` } : { ok: false, detalhe: j.message ?? `Resend respondeu HTTP ${r.status}.` };
  } catch {
    return { ok: false, detalhe: 'O serviço de e-mail não respondeu.' };
  }
}

const COR: Record<string, string> = { valida: '#15803d', vencendo: '#b45309', vencida: '#b91c1c', irregular: '#b91c1c', pendente: '#6b7280' };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function moldura(titulo: string, miolo: string, link: string) {
  return `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:680px;margin:auto;color:#111827">
  <p style="font-size:13px;color:#6b7280;margin:0 0 4px">CERTA · certidões em dia</p>
  <h1 style="font-size:20px;margin:0 0 16px">${esc(titulo)}</h1>${miolo}
  <p style="margin:24px 0 0"><a href="${link}" style="background:#0f3d3e;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-size:14px">Abrir o painel</a></p>
  <p style="font-size:12px;color:#9ca3af;margin-top:24px">Você recebe este e-mail porque configurou envios no CERTA. Para parar, desligue em Configurações.</p></div>`;
}

/** Resumo semanal: situação de cada empresa + PDFs vigentes anexados. */
export function emailSemanal(espaco: Espaco, empresas: EmpresaComCertidoes[], vigentes: CertidaoComArquivo[], link: string) {
  const linhas = empresas
    .map((e) => {
      const celulas = (Object.keys(INFO) as TipoCertidao[])
        .map((tipo) => {
          const c = e.certidoes.find((x) => x.tipo === tipo);
          const { estado, dias } = estadoDa(c, espaco.alerta_dias);
          return `<td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px;color:${COR[estado]}">${ROTULO_ESTADO[estado]}${c ? `<br><span style="color:#6b7280">${prazoTexto(dias)}</span>` : ''}</td>`;
        })
        .join('');
      return `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:13px"><b>${esc(e.razao_social)}</b><br><span style="color:#6b7280;font-size:12px">${formatarCnpj(e.cnpj)} · ${e.uf ?? ''}</span></td>${celulas}</tr>`;
    })
    .join('');
  const cab = (Object.values(INFO) as { nome: string }[]).map((i) => `<th style="text-align:left;padding:6px 8px;font-size:11px;color:#6b7280">${i.nome}</th>`).join('');
  const html = moldura(
    `Certidões da semana · ${espaco.nome}`,
    `<p style="font-size:14px">Situação de ${empresas.length} empresa(s). ${vigentes.length} certidão(ões) vigente(s) seguem em anexo.</p>
     <div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%"><tr><th></th>${cab}</tr>${linhas}</table></div>`,
    link,
  );
  // Limite prudente de anexos (Resend aceita até 40 MB por e-mail).
  let total = 0;
  const anexos: Anexo[] = [];
  for (const c of vigentes) {
    total += c.arquivo.length * 0.75;
    if (total > 25 * 1024 * 1024) break;
    anexos.push({ filename: `${c.empresa.slice(0, 40)} - ${INFO[c.tipo as TipoCertidao]?.nome ?? c.tipo} - ${dataBr(c.valida_ate).replace(/\//g, '-')}.pdf`, content: c.arquivo });
  }
  return { assunto: `CERTA · certidões da semana (${empresas.length} empresas)`, html, anexos };
}

export type ItemAlerta = { id: string; tipo: string; valida_ate: string | null; empresa: string; cnpj: string; marco: number };

/** Alerta de vencimento: só as certidões que cruzaram um marco (N dias, 7, 1, vencida). */
export function emailAlerta(espaco: Espaco, itens: ItemAlerta[], link: string) {
  const linhas = itens
    .map((i) => {
      const { dias } = estadoDa({ id: i.id, empresa_id: '', tipo: i.tipo, situacao: 'regular', valida_ate: i.valida_ate, origem: '', criado_em: '' }, espaco.alerta_dias);
      const cor = dias !== null && dias < 0 ? COR.vencida : COR.vencendo;
      return `<li style="margin:6px 0;font-size:14px"><b>${esc(i.empresa)}</b> · ${INFO[i.tipo as TipoCertidao]?.nome ?? i.tipo} — <span style="color:${cor}">${prazoTexto(dias)}</span> (${dataBr(i.valida_ate)})</li>`;
    })
    .join('');
  const vencidas = itens.filter((i) => i.marco === 0).length;
  return {
    assunto: vencidas > 0 ? `⚠ ${vencidas} certidão(ões) vencida(s) · CERTA` : `${itens.length} certidão(ões) perto de vencer · CERTA`,
    html: moldura('Certidões que precisam de renovação', `<ul style="padding-left:18px">${linhas}</ul>`, link),
  };
}
