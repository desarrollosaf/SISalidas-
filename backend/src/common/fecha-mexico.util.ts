/**
 * Fecha de "hoy" en la zona horaria de México Central (America/Mexico_City, UTC-6 fijo desde
 * que México eliminó el horario de verano en 2022), sin importar en qué zona horaria corra el
 * proceso de Node (en producción normalmente UTC). Se usa en vez de `new Date().toISOString()`,
 * que toma la fecha en UTC y puede adelantarse un día entre las 18:00 y 23:59 hora de México.
 */
export function fechaHoyMexico(): string {
  // en-CA formatea como YYYY-MM-DD, exactamente el formato que ya usa el resto del código.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Año en curso en México. */
export function anioActualMexico(): number {
  return Number(fechaHoyMexico().slice(0, 4));
}

/** Días completos entre "hoy" en México y una fecha YYYY-MM-DD (negativo si ya pasó). */
export function diasHastaFecha(fechaIso: string): number {
  const [anio, mes, dia] = fechaHoyMexico().split('-').map(Number);
  const hoy = Date.UTC(anio, mes - 1, dia);
  const [a2, m2, d2] = fechaIso.slice(0, 10).split('-').map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - hoy) / 86_400_000);
}

/**
 * Los DATETIME de `agendas` guardan la hora "de pared" de México. Con la zona UTC de Sequelize,
 * mysql2 los entrega como Date cuyas partes UTC son exactamente esa hora, así que se leen así.
 */
export function textoFechaHora(valor: Date | string): string {
  if (typeof valor === 'string') return valor.replace('T', ' ').slice(0, 19);
  return valor.toISOString().replace('T', ' ').slice(0, 19);
}
