/**
 * Catálogo das certidões que o CERTIFY acompanha: órgão, validade usual e onde
 * emitir. Validades marcadas como estimadas valem só até o PDF real ser lido
 * (a data impressa na certidão sempre prevalece).
 */

export type TipoCertidao = 'federal' | 'fgts' | 'trabalhista' | 'estadual' | 'municipal' | 'falencia' | 'consolidada';

/** Por onde a certidão sai: exemplo (demo), serviço oficial do TCU, Infosimples ou emissão assistida. */
export type Rota = 'demo' | 'tcu' | 'infosimples' | 'assistida';

export type Empresa = {
  id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string | null;
  uf?: string | null;
  municipio?: string | null;
  codigo_ibge?: string | null;
};

export type InfoCertidao = {
  tipo: TipoCertidao;
  nome: string;
  nomeCompleto: string;
  orgao: (e: Pick<Empresa, 'uf' | 'municipio'>) => string;
  /** Órgão sem empresa definida (página inicial). */
  orgaoGeral: string;
  /** Validade usual em dias, quando a certidão não informa. */
  validadeDias: number;
  validadeEstimada: boolean;
  /** Site oficial para emissão assistida (a pessoa resolve o CAPTCHA). */
  link: (e: Pick<Empresa, 'uf' | 'municipio'>) => { url: string; exato: boolean };
  /** Para que serve, em linguagem de cliente. */
  paraQue: string;
};

const busca = (termo: string) => ({ url: `https://www.google.com/search?q=${encodeURIComponent(termo)}`, exato: false });

export const CATALOGO: InfoCertidao[] = [
  {
    tipo: 'federal',
    nome: 'Federal',
    nomeCompleto: 'Certidão de Débitos Relativos a Créditos Tributários Federais e à Dívida Ativa da União',
    orgao: () => 'Receita Federal e PGFN',
    orgaoGeral: 'Receita Federal e PGFN',
    validadeDias: 180,
    validadeEstimada: false,
    link: () => ({ url: 'https://servicos.receitafederal.gov.br/servico/certidoes/#/home/cnpj', exato: true }),
    paraQue: 'Tributos federais e dívida ativa da União, inclusive INSS. Exigida em praticamente toda licitação.',
  },
  {
    tipo: 'fgts',
    nome: 'FGTS',
    nomeCompleto: 'Certificado de Regularidade do FGTS (CRF)',
    orgao: () => 'Caixa Econômica Federal',
    orgaoGeral: 'Caixa Econômica Federal',
    validadeDias: 30,
    validadeEstimada: false,
    link: () => ({ url: 'https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf', exato: true }),
    paraQue: 'Regularidade com o FGTS dos empregados. Vale só 30 dias: é a que mais vence.',
  },
  {
    tipo: 'trabalhista',
    nome: 'Trabalhista',
    nomeCompleto: 'Certidão Negativa de Débitos Trabalhistas (CNDT)',
    orgao: () => 'Tribunal Superior do Trabalho',
    orgaoGeral: 'Tribunal Superior do Trabalho',
    validadeDias: 180,
    validadeEstimada: false,
    link: () => ({ url: 'https://cndt-certidao.tst.jus.br/gerarCertidao.faces', exato: true }),
    paraQue: 'Débitos em execução na Justiça do Trabalho. Obrigatória em licitações (Lei 14.133).',
  },
  {
    tipo: 'estadual',
    nome: 'Estadual',
    nomeCompleto: 'Certidão Negativa de Débitos Estaduais',
    orgao: (e) => (e.uf ? `SEFAZ / PGE-${e.uf}` : 'Secretaria da Fazenda do estado'),
    orgaoGeral: 'SEFAZ ou PGE do estado da sede',
    validadeDias: 60,
    validadeEstimada: true,
    link: (e) =>
      e.uf === 'SP'
        ? { url: 'https://www.dividaativa.pge.sp.gov.br/sc/pages/crda/emitirCrda.jsf', exato: true }
        : busca(`certidão negativa de débitos estaduais SEFAZ ${e.uf ?? ''} emitir CNPJ`),
    paraQue: 'ICMS e dívida ativa do estado da sede. Cada UF tem o próprio site e prazo.',
  },
  {
    tipo: 'municipal',
    nome: 'Municipal',
    nomeCompleto: 'Certidão Negativa de Débitos Municipais',
    orgao: (e) => (e.municipio ? `Prefeitura de ${e.municipio}` : 'Prefeitura da sede'),
    orgaoGeral: 'Prefeitura da sede',
    validadeDias: 90,
    validadeEstimada: true,
    link: (e) => busca(`certidão negativa de débitos municipais ${e.municipio ?? ''} ${e.uf ?? ''} emitir CNPJ`),
    paraQue: 'ISS e tributos mobiliários da prefeitura da sede.',
  },
  {
    tipo: 'falencia',
    nome: 'Falência',
    nomeCompleto: 'Certidão de Distribuição de Falências e Recuperações Judiciais',
    orgao: (e) => (e.uf ? `Tribunal de Justiça (TJ-${e.uf})` : 'Tribunal de Justiça do estado'),
    orgaoGeral: 'Tribunal de Justiça do estado',
    validadeDias: 30,
    validadeEstimada: true,
    link: (e) =>
      e.uf === 'SP'
        ? { url: 'https://esaj.tjsp.jus.br/sco/abrirCadastro.do', exato: true }
        : busca(`certidão de falência e recuperação judicial TJ${e.uf ?? ''} pessoa jurídica emitir`),
    paraQue: 'Comprova que a empresa não está em falência ou recuperação. Pedida na qualificação econômico-financeira.',
  },
  {
    tipo: 'consolidada',
    nome: 'TCU · CNJ · CGU',
    nomeCompleto: 'Consulta Consolidada de Pessoa Jurídica (inidôneos TCU, improbidade CNJ, CEIS e CNEP)',
    orgao: () => 'TCU, CNJ e Portal da Transparência',
    orgaoGeral: 'TCU, CNJ e Portal da Transparência',
    validadeDias: 30,
    validadeEstimada: true,
    link: () => ({ url: 'https://certidoes-apf.apps.tcu.gov.br/', exato: true }),
    paraQue: 'Mostra se a empresa está impedida de contratar com o poder público. Emitida automaticamente.',
  },
];

export const INFO = Object.fromEntries(CATALOGO.map((c) => [c.tipo, c])) as Record<TipoCertidao, InfoCertidao>;
export const TIPOS = CATALOGO.map((c) => c.tipo);

export const UFS = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB',
  'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
] as const;
