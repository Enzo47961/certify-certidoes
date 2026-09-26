import 'server-only';
import { randomInt } from 'node:crypto';
import { INFO, type Empresa, type TipoCertidao } from '../catalogo';
import { gerarPdfDemo } from '../pdf-demo';
import type { Resultado } from '../situacao';
import { b64, hojeIso, somarDias, type CertidaoEmitida, type Emissao } from './tipos';

const hex = (n: number) => Array.from({ length: n }, () => '0123456789ABCDEF'[randomInt(16)]).join('');
const dig = (n: number) => Array.from({ length: n }, () => randomInt(10)).join('');

/** Número no formato que cada órgão usa (só para parecer real na demonstração). */
export function numeroDemo(tipo: TipoCertidao, emitida: string): string {
  const ano = emitida.slice(0, 4);
  switch (tipo) {
    case 'federal': return `${hex(4)}.${hex(4)}.${hex(4)}.${hex(4)}`;
    case 'fgts': return `${emitida.replace(/-/g, '')}${dig(11)}`;
    case 'trabalhista': return `${dig(8)}/${ano}`;
    case 'estadual': return `${ano}-${dig(7)}`;
    case 'municipal': return `MUN-${dig(4)}-${ano}`;
    case 'falencia': return dig(7);
    case 'consolidada': return '';
  }
}

export async function certidaoDemo(
  empresa: Pick<Empresa, 'cnpj' | 'razao_social' | 'uf' | 'municipio'>,
  tipo: TipoCertidao,
  opcoes: { emitida?: string; validaAte?: string; resultado?: Resultado } = {},
): Promise<CertidaoEmitida> {
  const emitida = opcoes.emitida ?? hojeIso();
  const validaAte = opcoes.validaAte ?? somarDias(emitida, INFO[tipo].validadeDias);
  const resultado = opcoes.resultado ?? 'regular';
  const numero = numeroDemo(tipo, emitida);
  const hora = `${String(8 + randomInt(9)).padStart(2, '0')}:${String(randomInt(60)).padStart(2, '0')}:${String(randomInt(60)).padStart(2, '0')}`;
  const pdf = await gerarPdfDemo({ tipo, empresa, resultado, emitidaEm: emitida, validaAte, numero, hora });
  return {
    tipo,
    situacao: resultado,
    numero: numero || null,
    emitida_em: `${emitida}T${hora}-03:00`,
    valida_ate: validaAte,
    origem: 'demo',
    arquivo: b64(pdf),
    arquivo_nome: `${tipo}-${empresa.cnpj}-${emitida}.pdf`,
    detalhes: { demonstracao: true, validade_estimada: INFO[tipo].validadeEstimada },
  };
}

/** Na demonstração, toda emissão é instantânea e regular. */
export async function emitirDemo(empresa: Pick<Empresa, 'cnpj' | 'razao_social' | 'uf' | 'municipio'>, tipo: TipoCertidao): Promise<Emissao> {
  return { status: 'emitida', certidao: await certidaoDemo(empresa, tipo) };
}
