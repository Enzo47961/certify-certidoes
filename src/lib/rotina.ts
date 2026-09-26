/** Regras de horário da rotina semanal (puras, testadas). */

/** Dia da semana (0 = domingo) e hora no fuso de Brasília. */
export function agoraBrasilia(agora = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short', hour: 'numeric', hourCycle: 'h23' })
      .formatToParts(agora)
      .map((x) => [x.type, x.value]),
  );
  return { dia: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), hora: Number(p.hour) };
}

/** A rotina semanal vence nesta hora? (e não saiu nas últimas 20 h, para não duplicar) */
export function rotinaDevida(e: { rotina_ativa: boolean; rotina_dia: number; rotina_hora: number; ultimo_envio: string | null }, agora = new Date()): boolean {
  if (!e.rotina_ativa) return false;
  const { dia, hora } = agoraBrasilia(agora);
  if (dia !== e.rotina_dia || hora !== e.rotina_hora) return false;
  return !e.ultimo_envio || agora.getTime() - Date.parse(e.ultimo_envio) > 20 * 3_600_000;
}
