import 'server-only';
import { recriarDemo } from './acoes';
import { rpc } from './banco';
import { configurar, empresasDo, registrarEvento, vigentesComArquivo, type Espaco } from './dados';
import { emailAlerta, emailSemanal, enviarEmail, type ItemAlerta } from './entrega/email';

import { agoraBrasilia, rotinaDevida } from './rotina';

const appUrl = () => (process.env.APP_URL ?? 'http://localhost:3400').replace(/\/+$/, '');

export async function enviarResumoSemanal(espaco: Espaco): Promise<{ ok: boolean; detalhe: string }> {
  if (!espaco.email) return { ok: false, detalhe: 'Cadastre um e-mail primeiro.' };
  const [empresas, vigentes] = await Promise.all([empresasDo(espaco.id), vigentesComArquivo(espaco.id)]);
  const { assunto, html, anexos } = emailSemanal(espaco, empresas, vigentes, `${appUrl()}/p/${espaco.token}`);
  const r = await enviarEmail(espaco.email, assunto, html, anexos);
  if (r.ok) await configurar(espaco.id, { ultimo_envio: new Date().toISOString() });
  await registrarEvento(espaco.id, 'email', r.ok ? 'ok' : 'erro', `Resumo semanal com ${anexos.length} PDF(s): ${r.detalhe}`);
  return r;
}

export async function enviarAlertas(espaco: Espaco): Promise<number> {
  if (!espaco.email || !espaco.alerta_ativo) return 0;
  const itens = await rpc<ItemAlerta[]>('certa_alertas_pendentes', { p_espaco: espaco.id, p_dias: espaco.alerta_dias });
  if (itens.length === 0) return 0;
  const { assunto, html } = emailAlerta(espaco, itens, `${appUrl()}/p/${espaco.token}`);
  const r = await enviarEmail(espaco.email, assunto, html);
  if (r.ok) await rpc('certa_marcar_alertas', { p_itens: itens.map((i) => ({ id: i.id, marco: i.marco })) });
  await registrarEvento(espaco.id, 'alerta', r.ok ? 'ok' : 'erro', `Alerta de vencimento (${itens.length} certidão/ões): ${r.detalhe}`);
  return r.ok ? itens.length : 0;
}

/** Roda de hora em hora (pg_cron → /api/agendador). */
export async function rodarAgendador(agora = new Date()) {
  const { hora } = agoraBrasilia(agora);
  const espacos = await rpc<Espaco[]>('certa_espacos_agendados');
  const relatorio = { espacos: espacos.length, resumos: 0, alertas: 0, demo: false, erros: [] as string[] };

  for (const e of espacos) {
    try {
      if (rotinaDevida(e, agora) && (await enviarResumoSemanal(e)).ok) relatorio.resumos++;
      // Alertas saem uma vez por dia, na hora escolhida para a rotina (padrão 8h).
      if (hora === e.rotina_hora) relatorio.alertas += await enviarAlertas(e);
    } catch (error) {
      relatorio.erros.push(`${e.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (hora === 3) {
    await recriarDemo();
    relatorio.demo = true;
  }
  return relatorio;
}
