import type { NovaCertidao } from '../dados';

export type CertidaoEmitida = Omit<NovaCertidao, 'empresa_id'>;

/**
 * Resultado de um pedido de emissão:
 * - `emitida`: o PDF veio e foi lido;
 * - `assistida`: o órgão exige CAPTCHA — a pessoa emite no site oficial e envia o PDF;
 * - `recente`: já emitida nas últimas 24 h — reaproveitada, sem nova consulta ao órgão;
 * - `falhou`: o órgão respondeu com erro ou ficou fora do ar.
 */
export type Emissao =
  | { status: 'emitida'; certidao: CertidaoEmitida }
  | { status: 'assistida'; link: string; linkExato: boolean; motivo: string }
  | { status: 'recente'; motivo: string }
  | { status: 'falhou'; motivo: string };

const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64');
export { b64 };

export const somarDias = (isoData: string, dias: number) => {
  const d = new Date(`${isoData.slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

export const hojeIso = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
