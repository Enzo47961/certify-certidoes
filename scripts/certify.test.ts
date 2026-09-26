import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { TIPOS, type TipoCertidao } from '../src/lib/catalogo';
import { cnpjValido, comDigitos, formatarCnpj } from '../src/lib/cnpj';
import { cnpjConfere, extrairTexto, lerTexto } from '../src/lib/leitura';
import { gerarPdfDemo } from '../src/lib/pdf-demo';
import { diasAte, estadoDa, prazoTexto, type CertidaoResumo } from '../src/lib/situacao';

test('CNPJ: dígitos verificadores e formatação', () => {
  assert.equal(cnpjValido('00.000.000/0001-91'), true);
  assert.equal(cnpjValido('00.000.000/0001-92'), false);
  assert.equal(cnpjValido('11111111111111'), false);
  assert.equal(formatarCnpj('191'), '00.000.000/0001-91');
  assert.equal(cnpjValido(comDigitos('123456780001')), true);
});

const cert = (valida_ate: string | null, situacao = 'regular'): CertidaoResumo =>
  ({ id: '1', empresa_id: 'e', tipo: 'fgts', situacao, valida_ate, origem: 'demo', criado_em: '' });

test('situação: válida, vencendo, vencida, com pendências e pendente', () => {
  const hoje = '2026-09-26';
  assert.equal(diasAte('2026-10-06', hoje), 10);
  assert.equal(estadoDa(cert('2026-12-01'), 15, hoje).estado, 'valida');
  assert.equal(estadoDa(cert('2026-10-06'), 15, hoje).estado, 'vencendo');
  assert.equal(estadoDa(cert('2026-09-26'), 15, hoje).estado, 'vencendo');
  assert.equal(estadoDa(cert('2026-09-25'), 15, hoje).estado, 'vencida');
  assert.equal(estadoDa(cert('2026-12-01', 'irregular'), 15, hoje).estado, 'irregular');
  assert.equal(estadoDa(undefined, 15, hoje).estado, 'pendente');
  assert.equal(prazoTexto(0), 'vence hoje');
  assert.equal(prazoTexto(-3), 'venceu há 3 dias');
});

const empresa = { cnpj: comDigitos('482715930001'), razao_social: 'Alfa Engenharia Ltda', uf: 'MG', municipio: 'Belo Horizonte' };

// Cada órgão numera de um jeito: código alfanumérico, só dígitos, número/ano.
const NUMEROS: Record<TipoCertidao, string> = {
  federal: 'A1B2.C3D4.E5F6.0718', fgts: '2026090102012345678', trabalhista: '51234567/2026', estadual: '2026-0098123',
  municipal: 'MUN-7781-2026', falencia: '1234567', consolidada: '',
};

for (const tipo of TIPOS as TipoCertidao[]) {
  test(`leitura: certidão ${tipo} gerada e lida de volta`, async () => {
    const pdf = await gerarPdfDemo({ tipo, empresa, resultado: 'regular', emitidaEm: '2026-09-01', validaAte: '2026-11-30', numero: NUMEROS[tipo] });
    const l = lerTexto(await extrairTexto(pdf));
    assert.equal(l.tipo, tipo);
    assert.equal(l.resultado, 'regular');
    assert.equal(l.emitidaEm, '2026-09-01');
    if (tipo !== 'consolidada') {
      assert.equal(l.validaAte, '2026-11-30');
      assert.equal(l.validadeEstimada, false);
      assert.ok(l.numero, 'número/código lido');
    }
    assert.equal(cnpjConfere(l, empresa.cnpj), true);
  });
}

test('leitura: consulta consolidada REAL do TCU', async () => {
  const l = lerTexto(await extrairTexto(readFileSync('scripts/fixture-tcu.pdf')));
  assert.equal(l.tipo, 'consolidada');
  assert.equal(l.resultado, 'regular');
  assert.equal(l.emitidaEm, '2026-09-26');
  assert.equal(l.validaAte, '2026-10-26');
  assert.equal(l.validadeEstimada, true);
  assert.deepEqual(l.cnpjs, ['00000000000191']);
});

test('leitura: formatos dos órgãos', () => {
  const federal = lerTexto('CERTIDÃO POSITIVA COM EFEITOS DE NEGATIVA DE DÉBITOS RELATIVOS AOS TRIBUTOS FEDERAIS E À DÍVIDA ATIVA DA UNIÃO Emitida às 10:22:15 do dia 02/03/2026 <hora e data de Brasília>. Válida até 29/08/2026. Código de controle da certidão: 4A2B.9C1D.77E0.3F5A');
  assert.deepEqual([federal.tipo, federal.resultado, federal.emitidaEm, federal.validaAte, federal.numero], ['federal', 'regular_com_ressalva', '2026-03-02', '2026-08-29', '4A2B.9C1D.77E0.3F5A']);
  const crf = lerTexto('Certificado de Regularidade do FGTS - CRF encontra-se em situação regular perante o Fundo de Garantia Validade:10/09/2026 a 09/10/2026 Certificação Número: 2026091002012345678901');
  assert.deepEqual([crf.tipo, crf.validaAte, crf.numero], ['fgts', '2026-10-09', '2026091002012345678901']);
  const tcu = lerTexto('Consulta Consolidada de Pessoa Jurídica Cadastro: Licitantes Inidôneos Resultado da consulta: Consta');
  assert.equal(tcu.resultado, 'irregular');
  const semData = lerTexto('CERTIDÃO NEGATIVA DE DÉBITOS TRABALHISTAS Expedição: 01/09/2026');
  assert.equal(semData.validaAte, '2027-02-28'); // 180 dias
  assert.equal(semData.validadeEstimada, true);
});
