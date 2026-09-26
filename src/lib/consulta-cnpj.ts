import 'server-only';
import { soDigitos } from './cnpj';

export type DadosCnpj = {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  uf: string | null;
  municipio: string | null;
  codigo_ibge: string | null;
  situacao: string | null;
};

const MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
const titulo = (s?: string | null) =>
  s
    ? s
        .toLowerCase()
        .split(' ')
        .map((p, i) => (i > 0 && MINUSCULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
        .join(' ')
    : null;

/** Dados cadastrais públicos da Receita (BrasilAPI, com a CNPJ.ws de reserva). */
export async function consultarCnpj(cnpj: string): Promise<DadosCnpj | null> {
  const c = soDigitos(cnpj);
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${c}`, { signal: AbortSignal.timeout(12_000), cache: 'no-store' });
    if (r.status === 404) return null;
    if (r.ok) {
      const j = (await r.json()) as Record<string, string | number | null>;
      return {
        cnpj: c,
        razao_social: String(j.razao_social ?? ''),
        nome_fantasia: (j.nome_fantasia as string) || null,
        uf: (j.uf as string) || null,
        municipio: titulo(j.municipio as string),
        codigo_ibge: j.codigo_municipio_ibge ? String(j.codigo_municipio_ibge) : null,
        situacao: (j.descricao_situacao_cadastral as string) || null,
      };
    }
  } catch {
    /* tenta a reserva */
  }

  const r = await fetch(`https://publica.cnpj.ws/cnpj/${c}`, { signal: AbortSignal.timeout(12_000), cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Consulta de CNPJ indisponível (HTTP ${r.status}).`);
  const j = (await r.json()) as {
    razao_social: string;
    estabelecimento?: {
      nome_fantasia?: string;
      situacao_cadastral?: string;
      estado?: { sigla?: string };
      cidade?: { nome?: string; ibge_id?: number };
    };
  };
  const est = j.estabelecimento ?? {};
  return {
    cnpj: c,
    razao_social: j.razao_social,
    nome_fantasia: est.nome_fantasia ?? null,
    uf: est.estado?.sigla ?? null,
    municipio: titulo(est.cidade?.nome),
    codigo_ibge: est.cidade?.ibge_id ? String(est.cidade.ibge_id) : null,
    situacao: est.situacao_cadastral ?? null,
  };
}
