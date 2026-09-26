/**
 * Certidões de EXEMPLO para a demonstração: seguem a estrutura das certidões
 * reais de cada órgão (título, campos, validade, código de controle), para que
 * o painel, a leitura automática e os envios funcionem de ponta a ponta — mas
 * levam marca d'água "sem valor legal" e empresas fictícias.
 */
import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { Empresa, TipoCertidao } from './catalogo';
import { formatarCnpj } from './cnpj';
import type { Resultado } from './situacao';

export type DadosDemo = {
  tipo: TipoCertidao;
  empresa: Pick<Empresa, 'cnpj' | 'razao_social' | 'uf' | 'municipio'>;
  resultado: Resultado;
  emitidaEm: string; // AAAA-MM-DD
  validaAte: string;
  numero: string;
  hora?: string;
};

const br = (iso: string) => iso.split('-').reverse().join('/');

function textoDa(d: DadosDemo): { cabecalho: string[]; titulo: string; corpo: string[]; rodape: string[] } {
  const nome = d.empresa.razao_social.toUpperCase();
  const cnpj = formatarCnpj(d.empresa.cnpj);
  const hora = d.hora ?? '09:14:22';
  const ressalva = d.resultado === 'regular_com_ressalva';
  switch (d.tipo) {
    case 'federal':
      return {
        cabecalho: ['MINISTÉRIO DA FAZENDA', 'Secretaria da Receita Federal do Brasil', 'Procuradoria-Geral da Fazenda Nacional'],
        titulo: ressalva
          ? 'CERTIDÃO POSITIVA COM EFEITOS DE NEGATIVA DE DÉBITOS RELATIVOS AOS TRIBUTOS FEDERAIS E À DÍVIDA ATIVA DA UNIÃO'
          : 'CERTIDÃO NEGATIVA DE DÉBITOS RELATIVOS AOS TRIBUTOS FEDERAIS E À DÍVIDA ATIVA DA UNIÃO',
        corpo: [
          `Nome: ${nome}`,
          `CNPJ: ${cnpj}`,
          ressalva
            ? 'Constam débitos com exigibilidade suspensa, nos termos do art. 151 do Código Tributário Nacional, o que não impede a emissão desta certidão com efeitos de negativa.'
            : 'Ressalvado o direito de a Fazenda Nacional cobrar e inscrever quaisquer dívidas de responsabilidade do sujeito passivo acima identificado que vierem a ser apuradas, é certificado que não constam pendências em seu nome.',
          'Esta certidão refere-se à situação do sujeito passivo no âmbito da RFB e da PGFN e abrange inclusive as contribuições sociais previdenciárias.',
        ],
        rodape: [
          `Emitida às ${hora} do dia ${br(d.emitidaEm)} <hora e data de Brasília>.`,
          `Válida até ${br(d.validaAte)}.`,
          `Código de controle da certidão: ${d.numero}`,
        ],
      };
    case 'fgts':
      return {
        cabecalho: ['CAIXA ECONÔMICA FEDERAL'],
        titulo: 'CERTIFICADO DE REGULARIDADE DO FGTS - CRF',
        corpo: [
          `Inscrição: ${cnpj}`,
          `Razão Social: ${nome}`,
          'O Agente Operador do FGTS certifica que, nesta data, a empresa acima identificada encontra-se em situação regular perante o Fundo de Garantia do Tempo de Serviço - FGTS.',
          'A utilização deste Certificado, para os fins previstos em Lei, está condicionada à verificação de autenticidade no site da Caixa.',
        ],
        rodape: [`Validade: ${br(d.emitidaEm)} a ${br(d.validaAte)}`, `Certificação Número: ${d.numero}`, `Informação obtida em ${br(d.emitidaEm)} ${hora}`],
      };
    case 'trabalhista':
      return {
        cabecalho: ['PODER JUDICIÁRIO', 'JUSTIÇA DO TRABALHO'],
        titulo: 'CERTIDÃO NEGATIVA DE DÉBITOS TRABALHISTAS',
        corpo: [
          `Nome: ${nome} (MATRIZ E FILIAIS)`,
          `CNPJ: ${cnpj}`,
          'Certifica-se que o requerente não consta como inadimplente no Banco Nacional de Devedores Trabalhistas.',
          'Certidão emitida gratuitamente, com base no art. 642-A da Consolidação das Leis do Trabalho.',
        ],
        rodape: [`Certidão nº: ${d.numero}`, `Expedição: ${br(d.emitidaEm)}, às ${hora}`, `Validade: ${br(d.validaAte)} - 180 (cento e oitenta) dias, contados da data de sua expedição.`],
      };
    case 'estadual':
      return {
        cabecalho: [`GOVERNO DO ESTADO - ${d.empresa.uf ?? ''}`, 'SECRETARIA DA FAZENDA', 'Procuradoria Geral do Estado'],
        titulo: ressalva ? 'CERTIDÃO POSITIVA COM EFEITOS DE NEGATIVA DE DÉBITOS ESTADUAIS' : 'CERTIDÃO NEGATIVA DE DÉBITOS TRIBUTÁRIOS ESTADUAIS',
        corpo: [
          `Contribuinte: ${nome}`,
          `CNPJ: ${cnpj}`,
          'Certificamos que, até a presente data, não constam débitos de ICMS declarados ou inscritos em dívida ativa estadual em nome do contribuinte acima.',
        ],
        rodape: [`Data de emissão: ${br(d.emitidaEm)}`, `Validade: ${br(d.validaAte)}`, `Número da certidão: ${d.numero}`],
      };
    case 'municipal':
      return {
        cabecalho: [`PREFEITURA MUNICIPAL DE ${(d.empresa.municipio ?? '').toUpperCase()}`, 'Secretaria Municipal da Fazenda'],
        titulo: 'CERTIDÃO NEGATIVA DE DÉBITOS DE TRIBUTOS MOBILIÁRIOS',
        corpo: [
          `Razão social: ${nome}`,
          `CNPJ: ${cnpj}`,
          'Certifica-se, para os devidos fins, que não constam débitos de ISS e taxas mobiliárias para o contribuinte acima identificado.',
        ],
        rodape: [`Data de emissão: ${br(d.emitidaEm)}`, `Validade: ${br(d.validaAte)}`, `Código de autenticidade: ${d.numero}`],
      };
    case 'falencia':
      return {
        cabecalho: [`PODER JUDICIÁRIO - TRIBUNAL DE JUSTIÇA DO ESTADO - ${d.empresa.uf ?? ''}`],
        titulo: 'CERTIDÃO DE DISTRIBUIÇÃO DE FALÊNCIAS, CONCORDATAS E RECUPERAÇÕES JUDICIAIS',
        corpo: [
          `Pesquisado: ${nome}`,
          `CNPJ: ${cnpj}`,
          'NADA CONSTA nos registros de distribuição de pedidos de falência, concordata, recuperação judicial e extrajudicial contra a pessoa jurídica acima.',
        ],
        rodape: [`Emitida em: ${br(d.emitidaEm)}`, `Validade: ${br(d.validaAte)}`, `Certidão nº ${d.numero}`],
      };
    case 'consolidada':
      return {
        cabecalho: ['TRIBUNAL DE CONTAS DA UNIÃO'],
        titulo: 'CONSULTA CONSOLIDADA DE PESSOA JURÍDICA',
        corpo: [
          `Razão social: ${nome}`,
          `CNPJ: ${cnpj}`,
          'Licitantes Inidôneos (TCU): NADA CONSTA',
          'CNIA - Improbidade Administrativa e Inelegibilidade (CNJ): NADA CONSTA',
          'CEIS - Empresas Inidôneas e Suspensas (Portal da Transparência): NADA CONSTA',
          'CNEP - Empresas Punidas (Portal da Transparência): NADA CONSTA',
        ],
        rodape: [`Emitida em ${br(d.emitidaEm)} ${hora.slice(0, 5)}`],
      };
  }
}

function quebrar(texto: string, fonte: PDFFont, tamanho: number, largura: number): string[] {
  const linhas: string[] = [];
  let atual = '';
  for (const palavra of texto.split(' ')) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (fonte.widthOfTextAtSize(tentativa, tamanho) > largura && atual) {
      linhas.push(atual);
      atual = palavra;
    } else atual = tentativa;
  }
  if (atual) linhas.push(atual);
  return linhas;
}

function escrever(p: PDFPage, linhas: string[], fonte: PDFFont, tamanho: number, y: number, centro = false): number {
  const { width } = p.getSize();
  for (const l of linhas) {
    const x = centro ? (width - fonte.widthOfTextAtSize(l, tamanho)) / 2 : 60;
    p.drawText(l, { x, y, size: tamanho, font: fonte, color: rgb(0.12, 0.12, 0.14) });
    y -= tamanho * 1.45;
  }
  return y;
}

export async function gerarPdfDemo(d: DadosDemo): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Certidão de exemplo - ${d.tipo}`);
  pdf.setProducer('CERTIFY (demonstração)');
  const p = pdf.addPage([595, 842]);
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { cabecalho, titulo, corpo, rodape } = textoDa(d);
  const largura = 475;

  let y = 780;
  for (const c of cabecalho) y = escrever(p, [c], negrito, 10, y, true);
  y -= 18;
  y = escrever(p, quebrar(titulo, negrito, 12.5, largura), negrito, 12.5, y, true);
  y -= 18;
  for (const par of corpo) {
    y = escrever(p, quebrar(par, normal, 10.5, largura), normal, 10.5, y);
    y -= 8;
  }
  y -= 14;
  for (const r of rodape) y = escrever(p, quebrar(r, normal, 10, largura), normal, 10, y);

  // Marca d'água e aviso: exemplo gerado pelo CERTIFY, sem valor legal.
  p.drawText('DEMONSTRAÇÃO · SEM VALOR LEGAL', {
    x: 95, y: 250, size: 34, font: negrito, color: rgb(0.85, 0.2, 0.2), opacity: 0.14, rotate: degrees(35),
  });
  p.drawText('Documento de exemplo gerado pelo CERTIFY para demonstração. Empresa e dados fictícios.', {
    x: 60, y: 40, size: 8, font: normal, color: rgb(0.55, 0.2, 0.2),
  });
  return pdf.save();
}
