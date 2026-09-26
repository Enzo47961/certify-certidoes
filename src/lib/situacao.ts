/**
 * Situação de uma certidão para o painel: combina o resultado (regular ou não)
 * com a validade. Função pura — a data de hoje entra como parâmetro.
 */

export type Resultado = 'regular' | 'regular_com_ressalva' | 'irregular' | 'indisponivel';

export type Estado = 'valida' | 'vencendo' | 'vencida' | 'irregular' | 'pendente';

export type CertidaoResumo = {
  id: string;
  empresa_id: string;
  tipo: string;
  situacao: Resultado | string;
  numero?: string | null;
  emitida_em?: string | null;
  valida_ate?: string | null;
  origem: string;
  arquivo_nome?: string | null;
  tem_arquivo?: boolean;
  detalhes?: Record<string, unknown>;
  criado_em: string;
};

/** Hoje no fuso de Brasília, como AAAA-MM-DD. */
export const hojeBrasilia = (agora = new Date()) => agora.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

export function diasAte(dataIso: string, hoje = hojeBrasilia()): number {
  const [a, b] = [Date.parse(`${dataIso.slice(0, 10)}T00:00:00Z`), Date.parse(`${hoje}T00:00:00Z`)];
  return Math.round((a - b) / 86_400_000);
}

export function estadoDa(c: CertidaoResumo | undefined, alertaDias: number, hoje = hojeBrasilia()): { estado: Estado; dias: number | null } {
  if (!c) return { estado: 'pendente', dias: null };
  const dias = c.valida_ate ? diasAte(c.valida_ate, hoje) : null;
  if (c.situacao === 'irregular') return { estado: 'irregular', dias };
  if (c.situacao === 'indisponivel') return { estado: 'pendente', dias };
  if (dias === null) return { estado: 'valida', dias };
  if (dias < 0) return { estado: 'vencida', dias };
  if (dias <= alertaDias) return { estado: 'vencendo', dias };
  return { estado: 'valida', dias };
}

export const ROTULO_RESULTADO: Record<string, string> = {
  regular: 'Negativa · regular',
  regular_com_ressalva: 'Positiva com efeitos de negativa',
  irregular: 'Positiva · com pendências',
  indisponivel: 'Órgão indisponível',
};

export const ROTULO_ESTADO: Record<Estado, string> = {
  valida: 'Válida',
  vencendo: 'Vencendo',
  vencida: 'Vencida',
  irregular: 'Com pendências',
  pendente: 'Não emitida',
};

/** Frase curta para o painel ("vence em 5 dias", "venceu há 2 dias"). */
export function prazoTexto(dias: number | null): string {
  if (dias === null) return 'sem validade informada';
  if (dias === 0) return 'vence hoje';
  if (dias === 1) return 'vence amanhã';
  if (dias > 1) return `vence em ${dias} dias`;
  return dias === -1 ? 'venceu ontem' : `venceu há ${-dias} dias`;
}

export const dataBr = (iso?: string | null) =>
  iso ? new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—';
