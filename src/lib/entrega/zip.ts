import 'server-only';
import { strToU8, zipSync, type Zippable } from 'fflate';
import { INFO, type TipoCertidao } from '../catalogo';
import { formatarCnpj } from '../cnpj';
import type { CertidaoComArquivo } from '../dados';
import { ROTULO_RESULTADO, dataBr } from '../situacao';

const limpo = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80);

/**
 * Pasta pronta para o servidor de arquivos ou o sistema jurídico:
 *   Empresa (CNPJ)/Tipo - válida até DD-MM-AAAA.pdf  +  resumo.csv
 */
export function montarZip(certidoes: CertidaoComArquivo[]): Uint8Array {
  const arquivos: Zippable = {};
  const linhas = [['Empresa', 'CNPJ', 'UF', 'Certidão', 'Resultado', 'Número', 'Emitida em', 'Válida até', 'Arquivo'].join(';')];

  for (const c of certidoes) {
    const pasta = limpo(`${c.empresa} (${c.cnpj})`);
    const nomeTipo = INFO[c.tipo as TipoCertidao]?.nome ?? c.tipo;
    const nome = `${limpo(nomeTipo)} - ${c.valida_ate ? `válida até ${dataBr(c.valida_ate).replace(/\//g, '-')}` : 'sem validade'}.pdf`;
    arquivos[`${pasta}/${nome}`] = [new Uint8Array(Buffer.from(c.arquivo, 'base64')), { level: 0 }];
    linhas.push(
      [c.empresa, formatarCnpj(c.cnpj), c.uf ?? '', nomeTipo, ROTULO_RESULTADO[c.situacao] ?? c.situacao, c.numero ?? '', dataBr(c.emitida_em), dataBr(c.valida_ate), `${pasta}/${nome}`]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(';'),
    );
  }
  // BOM para o Excel abrir o CSV em UTF-8.
  arquivos['resumo.csv'] = strToU8(`﻿${linhas.join('\r\n')}`);
  return zipSync(arquivos);
}
