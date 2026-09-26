import 'server-only';
import { NextResponse } from 'next/server';
import { empresasDo, espacoPorToken, type EmpresaComCertidoes, type Espaco } from './dados';

export class ErroHttp extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

export const erro = (status: number, mensagem: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ erro: mensagem, ...extra }, { status });

/** Espaço do link. `admin` exige o token de administração (o de leitura só baixa). */
export async function espacoDoToken(token: string, admin: boolean): Promise<Espaco> {
  const espaco = await espacoPorToken(token);
  if (!espaco) throw new ErroHttp(404, 'Painel não encontrado. Confira o link.');
  if (admin && espaco.leitura) throw new ErroHttp(403, 'Este link é só para consulta e download.');
  return espaco;
}

export async function empresaDoEspaco(espaco: Espaco, empresaId: unknown): Promise<EmpresaComCertidoes> {
  const empresa = (await empresasDo(espaco.id)).find((e) => e.id === empresaId);
  if (!empresa) throw new ErroHttp(404, 'Empresa não encontrada neste painel.');
  return empresa;
}

/** Converte exceções em resposta JSON amigável. */
export async function tratar(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ErroHttp) return erro(e.status, e.message);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('LIMITE_EMPRESAS')) return erro(409, 'Limite de empresas deste painel atingido.');
    console.error('[certify]', e);
    return erro(500, 'Algo deu errado do nosso lado. Tente de novo em instantes.');
  }
}
