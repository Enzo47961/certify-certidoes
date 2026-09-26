import 'server-only';
import { rpc } from './banco';
import type { Empresa } from './catalogo';
import type { CertidaoResumo } from './situacao';

export type Espaco = {
  id: string;
  token: string;
  token_leitura: string;
  nome: string;
  demo: boolean;
  leitura: boolean;
  alerta_ativo: boolean;
  alerta_dias: number;
  webhook_url: string | null;
  webhook_segredo: string;
};

export type EmpresaComCertidoes = Empresa & { criado_em: string; certidoes: CertidaoResumo[] };

export type Evento = { id: number; tipo: string; status: 'ok' | 'erro' | 'info'; detalhe: string | null; criado_em: string };

export type CertidaoComArquivo = CertidaoResumo & { arquivo: string; empresa: string; cnpj: string; uf: string | null };

export const MAX_EMPRESAS = 20;

export const espacoPorToken = (token: string) =>
  /^[a-f0-9]{36}$/.test(token) ? rpc<Espaco | null>('certify_espaco', { p_token: token }) : Promise.resolve(null);
export const espacoDemo = () => rpc<Espaco>('certify_espaco_demo');
export const criarEspaco = (nome: string) => rpc<Espaco>('certify_criar_espaco', { p_nome: nome });
export const empresasDo = (espaco: string) => rpc<EmpresaComCertidoes[]>('certify_empresas', { p_espaco: espaco });
export const adicionarEmpresa = (espaco: string, empresa: Omit<Empresa, 'id'>) =>
  rpc<Empresa>('certify_adicionar_empresa', { p_espaco: espaco, p_empresa: empresa, p_max: MAX_EMPRESAS });
export const removerEmpresa = (espaco: string, empresa: string) =>
  rpc<void>('certify_remover_empresa', { p_espaco: espaco, p_empresa: empresa });
export const historico = (espaco: string, empresa: string) =>
  rpc<CertidaoResumo[]>('certify_historico', { p_espaco: espaco, p_empresa: empresa });
export const arquivo = (espaco: string, certidao: string) =>
  rpc<{ nome: string; arquivo: string } | null>('certify_arquivo', { p_espaco: espaco, p_certidao: certidao });
export const vigentesComArquivo = (espaco: string) =>
  rpc<CertidaoComArquivo[]>('certify_vigentes_com_arquivo', { p_espaco: espaco }, 30_000);
export const configurar = (espaco: string, config: Record<string, unknown>) =>
  rpc<Espaco>('certify_configurar', { p_espaco: espaco, p_config: config });
export const eventos = (espaco: string) => rpc<Evento[]>('certify_eventos', { p_espaco: espaco });
export const registrarEvento = (espaco: string, tipo: string, status: Evento['status'], detalhe: string) =>
  rpc<void>('certify_evento', { p_espaco: espaco, p_tipo: tipo, p_status: status, p_detalhe: detalhe }).catch(() => undefined);

export type NovaCertidao = {
  empresa_id: string;
  tipo: string;
  situacao: string;
  numero: string | null;
  emitida_em: string | null;
  valida_ate: string | null;
  origem: 'demo' | 'tcu' | 'infosimples' | 'envio';
  arquivo: string | null; // base64
  arquivo_nome: string | null;
  detalhes?: Record<string, unknown>;
  criado_em?: string;
};

export const salvarCertidao = (espaco: string, certidao: NovaCertidao) =>
  rpc<CertidaoResumo>('certify_salvar_certidao', { p_espaco: espaco, p_certidao: certidao }, 30_000);
