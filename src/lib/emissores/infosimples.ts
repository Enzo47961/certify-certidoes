import 'server-only';
import { INFO, type Empresa, type TipoCertidao } from '../catalogo';
import { extrairTexto, lerTexto } from '../leitura';
import { b64, hojeIso, type Emissao } from './tipos';

/**
 * Conector da Infosimples (API paga que emite as certidões nos sites oficiais).
 * Liga sozinho quando INFOSIMPLES_TOKEN existe. Os caminhos de cada consulta
 * vêm do painel da Infosimples e podem ser trocados em INFOSIMPLES_CONSULTAS
 * (JSON: {"federal": "receita-federal/pgfn", ...}); "{uf}" vira a UF da empresa.
 *
 * O PDF devolvido passa pela mesma leitura das certidões enviadas à mão, então
 * validade, número e resultado saem do documento, não de nomes de campo.
 */
const PADRAO: Partial<Record<TipoCertidao, string>> = {
  federal: 'receita-federal/pgfn',
  fgts: 'caixa/regularidade',
  trabalhista: 'tribunal/tst/cndt',
  estadual: 'sefaz/{uf}/certidao-debitos',
};

export function consultaInfosimples(tipo: TipoCertidao, uf?: string | null): string | null {
  if (!process.env.INFOSIMPLES_TOKEN) return null;
  let mapa = PADRAO;
  try {
    mapa = { ...PADRAO, ...(JSON.parse(process.env.INFOSIMPLES_CONSULTAS ?? '{}') as typeof PADRAO) };
  } catch {
    /* mantém o padrão */
  }
  const caminho = mapa[tipo];
  if (!caminho) return null;
  if (caminho.includes('{uf}') && !uf) return null;
  return caminho.replace('{uf}', (uf ?? '').toLowerCase());
}

type RespostaInfosimples = { code: number; code_message?: string; errors?: string[]; site_receipts?: string[]; data?: Record<string, unknown>[] };

export async function emitirInfosimples(empresa: Pick<Empresa, 'cnpj' | 'uf'>, tipo: TipoCertidao): Promise<Emissao> {
  const consulta = consultaInfosimples(tipo, empresa.uf);
  if (!consulta) return { status: 'falhou', motivo: 'Consulta não configurada para este tipo de certidão.' };

  const corpo = new URLSearchParams({ token: process.env.INFOSIMPLES_TOKEN!, cnpj: empresa.cnpj, timeout: '300' });
  let r: RespostaInfosimples;
  try {
    const resp = await fetch(`https://api.infosimples.com/api/v2/consultas/${consulta}`, {
      method: 'POST',
      body: corpo,
      signal: AbortSignal.timeout(120_000),
      cache: 'no-store',
    });
    r = (await resp.json()) as RespostaInfosimples;
  } catch {
    return { status: 'falhou', motivo: 'A Infosimples não respondeu a tempo.' };
  }
  if (r.code !== 200) return { status: 'falhou', motivo: `Infosimples: ${r.code_message ?? r.errors?.join('; ') ?? `código ${r.code}`}` };

  // Comprovante em PDF (site_receipts): é a própria certidão emitida no site oficial.
  let pdf: Uint8Array | null = null;
  for (const url of r.site_receipts ?? []) {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      const bytes = new Uint8Array(await resp.arrayBuffer());
      if (Buffer.from(bytes.subarray(0, 5)).toString('latin1') === '%PDF-') {
        pdf = bytes;
        break;
      }
    } catch {
      /* tenta o próximo comprovante */
    }
  }
  if (!pdf) return { status: 'falhou', motivo: 'A Infosimples respondeu, mas sem o PDF da certidão.' };

  const l = lerTexto(await extrairTexto(pdf), tipo);
  const emitida = l.emitidaEm ?? hojeIso();
  return {
    status: 'emitida',
    certidao: {
      tipo,
      situacao: l.resultado,
      numero: l.numero,
      emitida_em: `${emitida}T12:00:00-03:00`,
      valida_ate: l.validaAte,
      origem: 'infosimples',
      arquivo: b64(pdf),
      arquivo_nome: `${tipo}-${empresa.cnpj}-${emitida}.pdf`,
      detalhes: { rotulo: l.rotulo, validade_estimada: l.validadeEstimada || INFO[tipo].validadeEstimada, consulta },
    },
  };
}
