import { TIPO_LABORAL } from '../common/reglas';

export const ESTADO_SALIDA = '5';
export const ESTADO_ENTRADA = '4';

/**
 * Checador de cada edificio → su `ubicaciones.id`, según la dirección de cada edificio.
 *
 * Laravel (PermisoUsers, desde el commit e67fb97 del 31/03/2026) numeraba 1 a 6 y comparaba ese
 * número contra ids de `ubicaciones`, donde el 1 es Santander y Matamoros es el 2. Desde entonces
 * casi ningún permiso laboral quedó ligado a su checada: bajaron de ~28 % a menos de 2 % al mes.
 */
export const UBICACION_POR_TERMINAL: Record<string, number> = {
  'D1-PER-OSFEM-MAT': 2, // Mariano Matamoros 106
  'D2-PER-OSFEM-ARCH': 25, // Archivo, Av. Miguel Hidalgo 1012
  'D3-PER-OSFEM-QROO': 4, // Andrés Quintana Roo 305
  'D4-PER-OSFEM-IND102': 3, // Av. Independencia 102
  'D5-PER-OSFEM-108': 24, // Av. Independencia 108 (San Rafael)
  'D6-PER-OSFEM-PISU': 27, // Av. Pino Suárez
};

export const TERMINALES = Object.keys(UBICACION_POR_TERMINAL);

/**
 * Si la checada es salida o entrada. Cada checada activa en ese mismo edificio alterna el estado:
 * - Al salir del propio edificio (o en permisos personales y de comida) la primera es salida.
 * - Al llegar a un destino de un permiso laboral, la primera es entrada.
 */
export function estadoDeChecada(permiso: {
  tipo: number;
  origen: number | null;
  ubicacion: number;
  checadasPrevias: number;
}): string {
  const llegaADestino = permiso.tipo === TIPO_LABORAL && permiso.origen !== permiso.ubicacion;
  const primera = llegaADestino ? ESTADO_ENTRADA : ESTADO_SALIDA;
  const siguiente = llegaADestino ? ESTADO_SALIDA : ESTADO_ENTRADA;
  return permiso.checadasPrevias === 0 ? primera : siguiente;
}
