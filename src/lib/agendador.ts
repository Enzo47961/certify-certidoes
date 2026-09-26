import 'server-only';
import { recriarDemo } from './acoes';
import { rpc } from './banco';
import { INFO, type TipoCertidao } from './catalogo';
import { registrarEvento, type Espaco } from './dados';
import { enviarWebhook } from './entrega/webhook';
import { diasAte } from './situacao';

const appUrl = () => (process.env.APP_URL ?? 'http://localhost:3400').replace(/\/+$/, '');

/** Hora cheia em Brasília (0–23). */
export const horaBrasilia = (agora = new Date()) =>
  Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hourCycle: 'h23' }).format(agora));

/** Hora do aviso diário de vencimento. */
export const HORA_ALERTA = 8;

type ItemAlerta = { id: string; tipo: string; valida_ate: string | null; empresa: string; cnpj: string; marco: number };

/**
 * Aviso de vencimento para o sistema integrado: só as certidões que cruzaram
 * um marco (janela escolhida, 7 dias, 1 dia, vencida) — cada marco uma vez só.
 */
export async function enviarAlertas(espaco: Espaco): Promise<number> {
  if (!espaco.webhook_url || !espaco.alerta_ativo) return 0;
  const itens = await rpc<ItemAlerta[]>('certify_alertas_pendentes', { p_espaco: espaco.id, p_dias: espaco.alerta_dias });
  if (itens.length === 0) return 0;

  const r = await enviarWebhook(espaco.webhook_url, espaco.webhook_segredo, 'certidoes.vencendo', {
    painel: `${appUrl()}/p/${espaco.token}`,
    certidoes: itens.map((i) => ({
      empresa: i.empresa,
      cnpj: i.cnpj,
      tipo: i.tipo,
      nome: INFO[i.tipo as TipoCertidao]?.nomeCompleto ?? i.tipo,
      valida_ate: i.valida_ate,
      dias_para_vencer: i.valida_ate ? diasAte(i.valida_ate) : null,
    })),
  });
  if (r.ok) await rpc('certify_marcar_alertas', { p_itens: itens.map((i) => ({ id: i.id, marco: i.marco })) });
  await registrarEvento(espaco.id, 'alerta', r.ok ? 'ok' : 'erro', `Aviso de vencimento (${itens.length} certidão/ões) enviado à integração: ${r.detalhe}`);
  return r.ok ? itens.length : 0;
}

/** Roda de hora em hora (pg_cron → /api/agendador): avisos às 8h, demonstração às 3h. */
export async function rodarAgendador(agora = new Date()) {
  const hora = horaBrasilia(agora);
  const relatorio = { hora, espacos: 0, alertas: 0, demo: false, erros: [] as string[] };

  if (hora === HORA_ALERTA) {
    const espacos = await rpc<Espaco[]>('certify_espacos_agendados');
    relatorio.espacos = espacos.length;
    for (const e of espacos) {
      try {
        relatorio.alertas += await enviarAlertas(e);
      } catch (error) {
        relatorio.erros.push(`${e.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  if (hora === 3) {
    await recriarDemo();
    relatorio.demo = true;
  }
  return relatorio;
}
