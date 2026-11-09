/** Utilidades de fechas y horas. Toda fecha "de hoy" es en hora de México, no la del navegador. */

const ZONA = 'America/Mexico_City';

export const JORNADA_INICIO = 9 * 60;
export const JORNADA_FIN = 18 * 60;

export function hoyMexico(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date());
}

export function horaActualMexico(): string {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: ZONA,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date());
}

export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

const formato = (opciones: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('es-MX', { ...opciones, timeZone: 'UTC' });

const LARGA = formato({ weekday: 'long', day: 'numeric', month: 'long' });
const CORTA = formato({ day: 'numeric', month: 'short' });
const MES = formato({ month: 'long', year: 'numeric' });
const SEMANA = formato({ weekday: 'short' });

const fecha = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`);

/** "viernes, 6 de noviembre" → "viernes 6 de noviembre". */
export const fechaLarga = (iso: string) => LARGA.format(fecha(iso)).replace(',', '');
export const fechaCorta = (iso: string) => CORTA.format(fecha(iso)).replace('.', '');
export const mesDe = (iso: string) => MES.format(fecha(iso));
export const diaSemanaCorto = (iso: string) => SEMANA.format(fecha(iso)).replace('.', '');
export const diaDelMes = (iso: string) => Number(iso.slice(8, 10));

/** "Hoy", "Mañana", "Ayer" o la fecha larga. */
export function fechaRelativa(iso: string, hoy = hoyMexico()): string {
  if (iso === hoy) return 'Hoy';
  if (iso === sumarDias(hoy, 1)) return 'Mañana';
  if (iso === sumarDias(hoy, -1)) return 'Ayer';
  return fechaLarga(iso);
}

export function aMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

export function aHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  return `${String(h).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
}

/** "1 h 30 min", "45 min" o "2 h". */
export function duracion(minutos: number | null | undefined): string {
  if (minutos == null) return '—';
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Guarda un archivo que llegó como blob. */
export function guardarArchivo(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Abre un PDF en otra pestaña; si el navegador lo bloquea, lo descarga. */
export function abrirPdf(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
  if (!window.open(url, '_blank')) guardarArchivo(blob, nombre);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
