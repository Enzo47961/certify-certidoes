/**
 * Leitura automática de uma certidão em PDF (emissão assistida: a pessoa baixa
 * no site oficial e envia aqui). Identifica tipo, resultado, número, emissão e
 * validade pelo texto impresso — cada órgão tem o seu jeito de escrever.
 *
 * `lerTexto` é pura (testada); `extrairTexto` usa o unpdf.
 */
import { INFO, type TipoCertidao } from './catalogo';
import { soDigitos } from './cnpj';
import type { Resultado } from './situacao';

export type Leitura = {
  tipo: TipoCertidao | null;
  resultado: Resultado;
  resultadoConfirmado: boolean;
  numero: string | null;
  emitidaEm: string | null; // AAAA-MM-DD
  validaAte: string | null; // AAAA-MM-DD
  validadeEstimada: boolean;
  cnpjs: string[];
  rotulo: string | null;
};

const DATA = String.raw`(\d{2})\/(\d{2})\/(\d{4})`;
const iso = (m: RegExpMatchArray, i = 1) => `${m[i + 2]}-${m[i + 1]}-${m[i]}`;

const TIPOS: Array<[TipoCertidao, RegExp]> = [
  ['consolidada', /consulta consolidada|licitantes inid[ôo]neos|cadastro nacional de empresas inid[ôo]neas/i],
  ['fgts', /certificado de regularidade do fgts|\bCRF\b|perante o fundo de garantia/i],
  ['trabalhista', /d[ée]bitos trabalhistas|\bCNDT\b/i],
  ['falencia', /fal[êe]ncia|recupera[çc][ãa]o judicial|concordata/i],
  ['federal', /tributos federais|d[íi]vida ativa da uni[ãa]o|receita federal do brasil/i],
  ['estadual', /d[ée]bitos (tribut[áa]rios )?estaduais|procuradoria[- ]geral do estado|d[íi]vida ativa (do estado|estadual)|secretaria (da|de) (estado da )?fazenda|\bICMS\b/i],
  ['municipal', /municipa(l|is)|prefeitura|tributos mobili[áa]rios|\bISS(QN)?\b/i],
];

export function detectarTipo(texto: string): TipoCertidao | null {
  return TIPOS.find(([, re]) => re.test(texto))?.[0] ?? null;
}

export function detectarResultado(texto: string): { resultado: Resultado; confirmado: boolean; rotulo: string | null } {
  const t = texto.replace(/\s+/g, ' ');
  // TCU/consolidada: basta um cadastro com "Consta" para a empresa ter restrição.
  if (/resultado da consulta:?\s*consta\b/i.test(t)) return { resultado: 'irregular', confirmado: true, rotulo: 'Consta registro' };
  if (/positiva com efeitos? de negativa/i.test(t)) return { resultado: 'regular_com_ressalva', confirmado: true, rotulo: 'Positiva com efeitos de negativa' };
  if (/certid[ãa]o positiva|(?<!n[ãa]o )\bconsta(m)? (d[ée]bitos|registros?|processos?)|situa[çc][ãa]o:? irregular/i.test(t) && !/nada consta/i.test(t))
    return { resultado: 'irregular', confirmado: true, rotulo: 'Positiva' };
  if (/certid[ãa]o negativa|nada consta|n[ãa]o constam?|situa[çc][ãa]o:? regular|est[áa] regular|encontra-se em situa[çc][ãa]o regular/i.test(t))
    return { resultado: 'regular', confirmado: true, rotulo: /nada consta/i.test(t) ? 'Nada consta' : 'Negativa' };
  return { resultado: 'regular', confirmado: false, rotulo: null };
}

function detectarValidade(t: string): string | null {
  const padroes = [
    new RegExp(String.raw`v[áa]lida at[ée]:?\s*${DATA}`, 'i'),
    new RegExp(String.raw`validade:?\s*${DATA}\s*a\s*${DATA}`, 'i'), // CRF: período — vale o fim
    new RegExp(String.raw`(?:data de )?validade:?\s*${DATA}`, 'i'),
    new RegExp(String.raw`v[áa]lid[ao] at[ée] o dia\s*${DATA}`, 'i'),
  ];
  for (const [i, re] of padroes.entries()) {
    const m = t.match(re);
    if (m) return i === 1 ? iso(m, 4) : iso(m);
  }
  return null;
}

function detectarEmissao(t: string): string | null {
  const padroes = [
    new RegExp(String.raw`emitida [àa]s \d{1,2}:\d{2}(?::\d{2})? do dia\s*${DATA}`, 'i'),
    new RegExp(String.raw`expedi[çc][ãa]o:?\s*${DATA}`, 'i'),
    new RegExp(String.raw`${DATA}\s*\d{2}:\d{2}(?::\d{2})?\s*consulta realizada em`, 'i'), // TCU
    new RegExp(String.raw`consulta realizada em:?\s*${DATA}`, 'i'),
    new RegExp(String.raw`validade:?\s*${DATA}\s*a\s*${DATA}`, 'i'), // CRF: o período começa na emissão
    new RegExp(String.raw`informa[çc][ãa]o obtida em:?\s*${DATA}`, 'i'),
    new RegExp(String.raw`(?:data (?:da|de) emiss[ãa]o|emitid[ao] em|emiss[ãa]o):?\s*${DATA}`, 'i'),
  ];
  for (const re of padroes) {
    const m = t.match(re);
    if (m) return iso(m);
  }
  return null;
}

function detectarNumero(t: string): string | null {
  const padroes = [
    /c[óo]digo de controle(?: da certid[ãa]o)?:?\s*([A-Z0-9]{4}(?:[.\-][A-Z0-9]{4}){2,4})/i,
    /certifica[çc][ãa]o n[úu]mero:?\s*(\d{6,})/i,
    /certid[ãa]o n[ºo°.]*:?\s*(\d[\d\/.\-]{4,})/i,
    /n[úu]mero da certid[ãa]o:?\s*([A-Z0-9\/.\-]{5,})/i,
    /c[óo]digo de autenticidade:?\s*([A-Z0-9.\-]{6,})/i,
  ];
  for (const re of padroes) {
    const m = t.match(re);
    if (m) return m[1].replace(/[.\-\/]+$/, '');
  }
  return null;
}

const somaDias = (isoData: string, dias: number) => {
  const d = new Date(`${isoData}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

export function lerTexto(texto: string, tipoEsperado?: TipoCertidao): Leitura {
  const t = texto.replace(/ /g, ' ').replace(/[ \t]+/g, ' ');
  const tipo = detectarTipo(t) ?? tipoEsperado ?? null;
  const { resultado, confirmado, rotulo } = detectarResultado(t);
  const emitidaEm = detectarEmissao(t);
  let validaAte = detectarValidade(t);
  let validadeEstimada = false;

  if (!validaAte && tipo) {
    const dias = t.match(/v[áa]lid[ao] por (\d{1,3}) \(?[a-zà-ú\s]*\)? ?dias/i);
    const base = emitidaEm ?? new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    validaAte = somaDias(base, dias ? Number(dias[1]) : INFO[tipo].validadeDias);
    validadeEstimada = !dias;
  }

  const cnpjs = [...new Set([...t.matchAll(/(?<!\d)\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}(?!\d)/g)].map((m) => soDigitos(m[0])))];
  return { tipo, resultado, resultadoConfirmado: confirmado, numero: detectarNumero(t), emitidaEm, validaAte, validadeEstimada, cnpjs, rotulo };
}

/** A certidão federal vale para a matriz e as filiais: basta bater a raiz (8 dígitos). */
export function cnpjConfere(leitura: Leitura, cnpj: string): boolean | null {
  if (leitura.cnpjs.length === 0) return null;
  return leitura.cnpjs.some((c) => c === cnpj || c.slice(0, 8) === cnpj.slice(0, 8));
}

export async function extrairTexto(pdf: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const doc = await getDocumentProxy(new Uint8Array(pdf));
  const { text } = await extractText(doc, { mergePages: true });
  return Array.isArray(text) ? text.join('\n') : text;
}
