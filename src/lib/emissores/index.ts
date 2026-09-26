import 'server-only';
import { INFO, type Empresa, type Rota, type TipoCertidao } from '../catalogo';
import { emitirDemo } from './demo';
import { consultaInfosimples, emitirInfosimples } from './infosimples';
import { emitirConsolidadaTcu } from './tcu';
import type { Emissao } from './tipos';

export type { Emissao } from './tipos';

/** Por onde cada certidão sai, conforme o espaço e as chaves configuradas. */
export function rotaDe(tipo: TipoCertidao, empresa: Pick<Empresa, 'uf'>, demo: boolean): Rota {
  if (demo) return 'demo';
  if (tipo === 'consolidada') return 'tcu';
  if (consultaInfosimples(tipo, empresa.uf)) return 'infosimples';
  return 'assistida';
}

export async function emitir(empresa: Empresa, tipo: TipoCertidao, demo: boolean): Promise<Emissao> {
  const rota = rotaDe(tipo, empresa, demo);
  if (rota === 'demo') return emitirDemo(empresa, tipo);
  if (rota === 'tcu') return emitirConsolidadaTcu(empresa);
  if (rota === 'infosimples') return emitirInfosimples(empresa, tipo);
  const { url, exato } = INFO[tipo].link(empresa);
  return {
    status: 'assistida',
    link: url,
    linkExato: exato,
    motivo: `${INFO[tipo].orgao(empresa)} exige a verificação "não sou um robô". Emita no site oficial e envie o PDF aqui: o CERTA lê a validade sozinho.`,
  };
}
