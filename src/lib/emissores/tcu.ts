import 'server-only';
import { INFO, type Empresa } from '../catalogo';
import { consumir } from '../limite';
import { hojeIso, somarDias, type Emissao } from './tipos';

type ItemTcu = { emissor: string; tipo: string; descricao: string; situacao: string; dataHoraEmissao: string };

const CONSULTA_MANUAL = 'https://certidoes-apf.apps.tcu.gov.br/';
/** Teto de chamadas ao TCU por hora, somando todos os painéis (o serviço é público e tem firewall). */
const TETO_POR_HORA = 20;

const assistida = (motivo: string): Emissao => ({ status: 'assistida', link: CONSULTA_MANUAL, linkExato: true, motivo });

/**
 * Consulta Consolidada de Pessoa Jurídica do TCU: serviço público, sem CAPTCHA,
 * que devolve o PDF oficial com quatro cadastros (inidôneos TCU, improbidade
 * CNJ, CEIS e CNEP).
 *
 * O TCU protege o serviço com firewall: acima de um volume, bloqueia o IP por
 * um tempo e responde uma página HTML. O CERTIFY respeita isso — limita o próprio
 * ritmo e, se for bloqueado, passa a certidão para a emissão assistida em vez
 * de insistir.
 */
export async function emitirConsolidadaTcu(empresa: Pick<Empresa, 'cnpj'>): Promise<Emissao> {
  if (!(await consumir('tcu-global', 'tcu', TETO_POR_HORA, 1))) {
    return assistida('Muitas consultas ao TCU nesta hora. Emita no site do TCU e envie o PDF, ou tente de novo mais tarde.');
  }

  let resposta: Response;
  try {
    resposta = await fetch(`https://certidoes-apf.apps.tcu.gov.br/api/rest/publico/certidoes/${empresa.cnpj}?seEmitirPDF=true`, {
      signal: AbortSignal.timeout(30_000),
      cache: 'no-store',
    });
  } catch {
    return { status: 'falhou', motivo: 'O serviço do TCU não respondeu a tempo. Tente de novo em alguns minutos.' };
  }
  if (!resposta.ok) return { status: 'falhou', motivo: `O TCU recusou a consulta (HTTP ${resposta.status}).` };

  const texto = await resposta.text();
  let j: { certidaoPDF?: string; certidoes?: ItemTcu[] };
  try {
    j = JSON.parse(texto);
  } catch {
    // Página HTML = firewall do TCU limitando consultas automáticas deste servidor.
    return /bloquead|rejeitad/i.test(texto)
      ? assistida('O TCU está limitando consultas automáticas agora. Emita no site do TCU (sem CAPTCHA) e envie o PDF; a automática volta sozinha.')
      : { status: 'falhou', motivo: 'O TCU respondeu num formato inesperado.' };
  }

  const itens = j.certidoes ?? [];
  if (!j.certidaoPDF || itens.length === 0) return { status: 'falhou', motivo: 'O TCU não devolveu a certidão para este CNPJ.' };

  const consta = itens.some((i) => i.situacao === 'CONSTA');
  const todosFora = itens.every((i) => i.situacao === 'SISTEMA_INDISPONIVEL');
  const [dia, mes, ano] = (itens[0]?.dataHoraEmissao ?? '').split(' ')[0].split('/');
  const emitida = ano ? `${ano}-${mes}-${dia}` : hojeIso();

  return {
    status: 'emitida',
    certidao: {
      tipo: 'consolidada',
      situacao: consta ? 'irregular' : todosFora ? 'indisponivel' : 'regular',
      numero: null,
      emitida_em: `${emitida}T12:00:00-03:00`,
      valida_ate: somarDias(emitida, INFO.consolidada.validadeDias),
      origem: 'tcu',
      arquivo: j.certidaoPDF,
      arquivo_nome: `consulta-consolidada-tcu-${empresa.cnpj}-${emitida}.pdf`,
      detalhes: {
        validade_estimada: true,
        rotulo: consta ? 'Consta registro' : 'Nada consta',
        cadastros: itens.map((i) => ({ emissor: i.emissor, cadastro: i.tipo, descricao: i.descricao, situacao: i.situacao })),
      },
    },
  };
}
