import 'server-only';
import { CATALOGO, INFO, TIPOS, type Empresa, type TipoCertidao } from './catalogo';
import { cnpjValido, comDigitos, formatarCnpj } from './cnpj';
import {
  adicionarEmpresa,
  configurar,
  espacoDemo,
  registrarEvento,
  salvarCertidao,
  type Espaco,
  type NovaCertidao,
} from './dados';
import { rpc } from './banco';
import { certidaoDemo } from './emissores/demo';
import { emitir, type Emissao } from './emissores';
import { hojeIso, somarDias } from './emissores/tipos';
import { enviarWebhook } from './entrega/webhook';
import { cnpjConfere, extrairTexto, lerTexto } from './leitura';
import { ROTULO_RESULTADO, type CertidaoResumo, type Resultado } from './situacao';

/** Grava a certidão e, fora da demo, avisa o sistema integrado (webhook). */
export async function registrarCertidao(espaco: Espaco, empresa: Empresa, certidao: Omit<NovaCertidao, 'empresa_id'>): Promise<CertidaoResumo> {
  const salva = await salvarCertidao(espaco.id, { ...certidao, empresa_id: empresa.id });
  if (espaco.webhook_url && !espaco.demo) {
    const r = await enviarWebhook(espaco.webhook_url, espaco.webhook_segredo, 'certidao.emitida', {
      empresa: { cnpj: empresa.cnpj, razao_social: empresa.razao_social, uf: empresa.uf, municipio: empresa.municipio },
      certidao: { ...salva, nome: INFO[certidao.tipo as TipoCertidao]?.nomeCompleto, resultado: ROTULO_RESULTADO[salva.situacao] },
      pdf_base64: certidao.arquivo,
    });
    await registrarEvento(espaco.id, 'webhook', r.ok ? 'ok' : 'erro', `${INFO[certidao.tipo as TipoCertidao]?.nome} · ${empresa.razao_social}: ${r.detalhe}`);
  }
  return salva;
}

export type ResultadoEmissao = { tipo: TipoCertidao; emissao: Emissao; certidao?: CertidaoResumo };

/** Emite os tipos pedidos para uma empresa (3 órgãos por vez). */
export async function emitirParaEmpresa(
  espaco: Espaco,
  empresa: Empresa & { certidoes?: CertidaoResumo[] },
  tipos: TipoCertidao[],
): Promise<ResultadoEmissao[]> {
  const fila = [...tipos];
  const resultados: ResultadoEmissao[] = [];
  const trabalhador = async () => {
    for (let tipo = fila.shift(); tipo; tipo = fila.shift()) {
      // Serviços públicos (TCU): a mesma certidão emitida há menos de 24 h é reaproveitada.
      const atual = empresa.certidoes?.find((c) => c.tipo === tipo);
      if (!espaco.demo && atual?.origem === 'tcu' && Date.now() - Date.parse(atual.criado_em) < 24 * 3_600_000) {
        resultados.push({ tipo, emissao: { status: 'recente', motivo: 'Emitida há menos de 24 h: mantida a mesma certidão.' }, certidao: atual });
        continue;
      }
      const emissao = await emitir(empresa, tipo, espaco.demo);
      const item: ResultadoEmissao = { tipo, emissao };
      if (emissao.status === 'emitida') item.certidao = await registrarCertidao(espaco, empresa, emissao.certidao);
      resultados.push(item);
    }
  };
  await Promise.all([trabalhador(), trabalhador(), trabalhador()]);

  const emitidas = resultados.filter((r) => r.emissao.status === 'emitida').length;
  const falhas = resultados.filter((r) => r.emissao.status === 'falhou');
  await registrarEvento(
    espaco.id,
    'emissao',
    falhas.length ? 'erro' : 'ok',
    `${empresa.razao_social}: ${emitidas} emitida(s) automaticamente${falhas.length ? `, ${falhas.length} com falha no órgão` : ''}.`,
  );
  return resultados.sort((a, b) => TIPOS.indexOf(a.tipo) - TIPOS.indexOf(b.tipo));
}

export type ResultadoEnvio =
  | { ok: true; certidao: CertidaoResumo; avisos: string[] }
  | { ok: false; erro: string; precisaConfirmar?: boolean };

/**
 * Emissão assistida: lê o PDF baixado do site oficial. Recusa arquivo de outro
 * CNPJ (a não ser que a pessoa confirme) e avisa o que não deu para ler.
 */
export async function receberPdf(
  espaco: Espaco,
  empresa: Empresa,
  pdf: Uint8Array,
  nomeArquivo: string,
  opcoes: { tipo?: TipoCertidao; confirmar?: boolean },
): Promise<ResultadoEnvio> {
  if (Buffer.from(pdf.subarray(0, 5)).toString('latin1') !== '%PDF-') return { ok: false, erro: 'O arquivo não é um PDF.' };
  let texto = '';
  try {
    texto = await extrairTexto(pdf);
  } catch {
    return { ok: false, erro: 'Não foi possível abrir o PDF. Ele pode estar protegido ou corrompido.' };
  }
  if (texto.replace(/\s/g, '').length < 40) {
    return { ok: false, erro: 'O PDF não tem texto (parece uma imagem escaneada). Baixe a certidão original no site do órgão.' };
  }

  const l = lerTexto(texto, opcoes.tipo);
  const tipo = opcoes.tipo ?? l.tipo;
  if (!tipo) return { ok: false, erro: 'Não reconheci o tipo desta certidão. Escolha o tipo e envie de novo.' };
  if (opcoes.tipo && l.tipo && l.tipo !== opcoes.tipo && !opcoes.confirmar) {
    return { ok: false, erro: `Este PDF parece ser a certidão ${INFO[l.tipo].nome}, não ${INFO[opcoes.tipo].nome}.`, precisaConfirmar: true };
  }
  if (cnpjConfere(l, empresa.cnpj) === false && !opcoes.confirmar) {
    return { ok: false, erro: `O CNPJ impresso no PDF não é o de ${empresa.razao_social} (${formatarCnpj(empresa.cnpj)}).`, precisaConfirmar: true };
  }

  const avisos: string[] = [];
  if (!l.resultadoConfirmado) avisos.push('Não encontrei a palavra "negativa" ou "positiva": confira o resultado no PDF.');
  if (l.validadeEstimada) avisos.push(`A certidão não informa validade; considerei ${INFO[tipo].validadeDias} dias, o usual para este órgão.`);
  if (!l.numero && tipo !== 'consolidada') avisos.push('Número ou código de controle não encontrado no texto.');

  const emitida = l.emitidaEm ?? hojeIso();
  const certidao = await registrarCertidao(espaco, empresa, {
    tipo,
    situacao: l.resultado,
    numero: l.numero,
    emitida_em: `${emitida}T12:00:00-03:00`,
    valida_ate: l.validaAte,
    origem: 'envio',
    arquivo: Buffer.from(pdf).toString('base64'),
    arquivo_nome: nomeArquivo.replace(/[^\w.\- ]+/g, '_').slice(0, 120) || `${tipo}.pdf`,
    detalhes: { rotulo: l.rotulo, validade_estimada: l.validadeEstimada, avisos },
  });
  await registrarEvento(espaco.id, 'envio', 'ok', `${INFO[tipo].nome} · ${empresa.razao_social}: PDF lido, válida até ${l.validaAte?.split('-').reverse().join('/') ?? '—'}.`);
  return { ok: true, certidao, avisos };
}

/* ------------------------------ demonstração ------------------------------ */

type Cenario = Partial<Record<TipoCertidao, number | 'pendente' | 'ressalva'>>;

// Empresas e CNPJs fictícios (dígitos verificadores válidos, bases inventadas).
const EMPRESAS_DEMO: Array<{ base: string; razao_social: string; nome_fantasia: string; uf: string; municipio: string; cenario: Cenario }> = [
  { base: '482715930001', razao_social: 'Horizonte Engenharia e Construções Ltda', nome_fantasia: 'Horizonte Engenharia', uf: 'SP', municipio: 'São Paulo', cenario: { fgts: 4, municipal: 'pendente' } },
  { base: '539601270001', razao_social: 'Vale Verde Alimentos S.A.', nome_fantasia: 'Vale Verde', uf: 'MG', municipio: 'Belo Horizonte', cenario: { federal: 'ressalva' } },
  { base: '618342050001', razao_social: 'Litoral Serviços de Limpeza Ltda', nome_fantasia: 'Litoral Serviços', uf: 'BA', municipio: 'Salvador', cenario: { fgts: -3, trabalhista: 12 } },
  { base: '720493180001', razao_social: 'Araucária Tecnologia da Informação Ltda', nome_fantasia: 'Araucária TI', uf: 'PR', municipio: 'Curitiba', cenario: {} },
  { base: '305817640001', razao_social: 'Pampa Transportes e Logística Ltda', nome_fantasia: 'Pampa Log', uf: 'RS', municipio: 'Porto Alegre', cenario: { estadual: 9, falencia: -1 } },
  { base: '846120970001', razao_social: 'Guanabara Materiais Hospitalares Ltda', nome_fantasia: 'Guanabara Hospitalar', uf: 'RJ', municipio: 'Rio de Janeiro', cenario: { federal: 2 } },
  { base: '193750480001', razao_social: 'Cerrado Soluções Ambientais Ltda', nome_fantasia: 'Cerrado Ambiental', uf: 'GO', municipio: 'Goiânia', cenario: { estadual: 'pendente', falencia: 'pendente', municipal: 'pendente' } },
  { base: '662084310001', razao_social: 'Maré Alta Comércio de Uniformes Ltda', nome_fantasia: 'Maré Alta Uniformes', uf: 'PE', municipio: 'Recife', cenario: { fgts: 14 } },
];

const aleatorio = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

/** Recria o espaço de demonstração (chamado ao abrir a demo vazia e todo dia às 3h). */
export async function recriarDemo(): Promise<Espaco> {
  await rpc('certa_limpar_demo');
  const espaco = await espacoDemo();
  await configurar(espaco.id, { alerta_dias: 15 });
  const hoje = hojeIso();
  const tarefas: Array<() => Promise<unknown>> = [];

  for (const [indice, e] of EMPRESAS_DEMO.entries()) {
    const cnpj = comDigitos(e.base);
    if (!cnpjValido(cnpj)) continue;
    const empresa = { ...(await adicionarEmpresa(espaco.id, { cnpj, razao_social: e.razao_social, nome_fantasia: e.nome_fantasia, uf: e.uf, municipio: e.municipio, codigo_ibge: null })) };

    for (const { tipo, validadeDias } of CATALOGO) {
      const c = e.cenario[tipo];
      if (c === 'pendente') continue;
      const validaAte = typeof c === 'number' ? somarDias(hoje, c) : somarDias(hoje, aleatorio(20, Math.max(21, validadeDias - 3)));
      const emitida = somarDias(validaAte, -validadeDias);
      const resultado: Resultado = c === 'ressalva' ? 'regular_com_ressalva' : 'regular';
      tarefas.push(async () => {
        // Histórico: a certidão anterior (já vencida) das três primeiras empresas.
        if (indice < 3 && (tipo === 'fgts' || tipo === 'federal')) {
          const anterior = await certidaoDemo(empresa, tipo, { emitida: somarDias(emitida, -validadeDias), validaAte: somarDias(emitida, -1) });
          await salvarCertidao(espaco.id, { ...anterior, empresa_id: empresa.id, criado_em: `${somarDias(emitida, -validadeDias)}T10:00:00-03:00` });
        }
        const atual = await certidaoDemo(empresa, tipo, { emitida, validaAte, resultado });
        await salvarCertidao(espaco.id, { ...atual, empresa_id: empresa.id, criado_em: `${emitida}T10:00:00-03:00` });
      });
    }
  }

  const fila = [...tarefas];
  await Promise.all(Array.from({ length: 6 }, async () => {
    for (let t = fila.shift(); t; t = fila.shift()) await t();
  }));
  await registrarEvento(espaco.id, 'demo', 'info', `Demonstração recriada: ${EMPRESAS_DEMO.length} empresas fictícias e ${tarefas.length} certidões de exemplo.`);
  return espaco;
}
