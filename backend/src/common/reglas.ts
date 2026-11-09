/**
 * Reglas de negocio puras (sin base de datos), para poder probarlas directamente.
 */

/** id_Dependencia de OSFEM en el padrón. */
export const DEPENDENCIA_OSFEM = 3;

export const TIPO_PERSONAL = 1;
export const TIPO_LABORAL = 2;
export const TIPO_COMIDA = 3;

export const NOMBRE_TIPO: Record<number, string> = {
  [TIPO_PERSONAL]: 'Personal',
  [TIPO_LABORAL]: 'Laboral',
  [TIPO_COMIDA]: 'Comida',
};

const LETRA_TIPO: Record<number, string> = {
  [TIPO_PERSONAL]: 'P',
  [TIPO_LABORAL]: 'L',
  [TIPO_COMIDA]: 'C',
};

/** idDestino que significa "otro": el destino va en texto libre. */
export const DESTINO_OTRO = 999;

/** Edificios de OSFEM desde los que se puede salir (ubicaciones.id). */
export const ORIGENES_PERMITIDOS = [2, 3, 4, 24, 25, 27, 29];

export const JORNADA_INICIO = '09:00';
export const JORNADA_FIN = '18:00';

/** Máximo de días hacia adelante: en Laravel no había límite y existen permisos del año 5025. */
export const DIAS_MAXIMOS_ANTICIPACION = 365;

/** Quién manda: en OSFEM los rangos 1 a 4; en las demás dependencias, 1 a 3. */
export function esJefe(idDependencia: number | null, rango: number | null): boolean {
  if (!rango) return false;
  const limite = idDependencia === DEPENDENCIA_OSFEM ? 4 : 3;
  return rango >= 1 && rango <= limite;
}

/** Rango que le toca a un validador especial según la clave presupuestal del departamento. */
export function rangoPorClave(clavePresupuestal: number | string): number {
  const clave = String(clavePresupuestal);
  if (clave === '30001') return 1;
  if (clave.endsWith('01')) return 2;
  if (clave.endsWith('1')) return 3;
  return 4;
}

export function textoFolio(
  rfc: string,
  tipo: number,
  folio: number,
  fechaPermiso: string,
): string {
  return `${rfc}/${LETRA_TIPO[tipo] ?? '?'}/${folio}/${fechaPermiso.slice(0, 4)}`;
}

export interface SolicitudPorValidar {
  fecha_permiso: string;
  hora_salida: string;
  regresa: boolean;
  hora_regreso?: string | null;
  tipo_permiso: number;
  origen?: number | null;
  destinos?: number[];
  otro?: string | null;
}

/**
 * Lo que Laravel solo revisaba en el navegador. Devuelve los errores en español; vacío = válida.
 * `hoy` en formato YYYY-MM-DD, en hora de México.
 */
export function erroresSolicitud(s: SolicitudPorValidar, hoy: string): string[] {
  const errores: string[] = [];

  if (s.fecha_permiso < hoy) {
    errores.push('La fecha del permiso no puede ser anterior a hoy');
  } else if (diasEntre(hoy, s.fecha_permiso) > DIAS_MAXIMOS_ANTICIPACION) {
    errores.push('La fecha del permiso no puede ser de más de un año adelante');
  }

  if (!dentroDeJornada(s.hora_salida)) {
    errores.push('La hora de salida debe ser de 9:00 a 18:00');
  }

  if (s.regresa) {
    if (!s.hora_regreso) {
      errores.push('Indica la hora de regreso');
    } else if (!dentroDeJornada(s.hora_regreso)) {
      errores.push('La hora de regreso debe ser de 9:00 a 18:00');
    } else if (s.hora_regreso <= s.hora_salida) {
      errores.push('La hora de regreso debe ser mayor a la de salida');
    }
  }

  if (s.tipo_permiso === TIPO_LABORAL) {
    if (!s.origen || !ORIGENES_PERMITIDOS.includes(s.origen)) {
      errores.push('Selecciona el edificio de origen');
    }
    if (!s.destinos?.length) {
      errores.push('Selecciona al menos un destino');
    } else if (s.destinos.includes(DESTINO_OTRO) && !s.otro?.trim()) {
      errores.push('Especifica el otro destino');
    }
  }

  return errores;
}

const dentroDeJornada = (hora: string) => hora >= JORNADA_INICIO && hora <= JORNADA_FIN;

function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000);
}

/** Minutos entre dos horas HH:mm[:ss]; null si falta alguna. */
export function minutosEntre(inicio?: string | null, fin?: string | null): number | null {
  if (!inicio || !fin) return null;
  const aMinutos = (h: string) => {
    const [hh, mm, ss = '0'] = h.split(':');
    return Number(hh) * 60 + Number(mm) + Number(ss) / 60;
  };
  return Math.round(Math.abs(aMinutos(fin) - aMinutos(inicio)));
}
