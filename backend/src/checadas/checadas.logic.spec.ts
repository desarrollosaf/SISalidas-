import { TIPO_COMIDA, TIPO_LABORAL, TIPO_PERSONAL } from '../common/reglas';
import { ESTADO_ENTRADA, ESTADO_SALIDA, estadoDeChecada, UBICACION_POR_TERMINAL } from './checadas.logic';

describe('estadoDeChecada', () => {
  it.each([TIPO_PERSONAL, TIPO_COMIDA])('tipo %s: primero sale y luego entra', (tipo) => {
    const base = { tipo, origen: null, ubicacion: 2 };
    expect(estadoDeChecada({ ...base, checadasPrevias: 0 })).toBe(ESTADO_SALIDA);
    expect(estadoDeChecada({ ...base, checadasPrevias: 1 })).toBe(ESTADO_ENTRADA);
  });

  it('laboral en su edificio de origen: primero sale y al volver entra', () => {
    const base = { tipo: TIPO_LABORAL, origen: 2, ubicacion: 2 };
    expect(estadoDeChecada({ ...base, checadasPrevias: 0 })).toBe(ESTADO_SALIDA);
    expect(estadoDeChecada({ ...base, checadasPrevias: 1 })).toBe(ESTADO_ENTRADA);
  });

  it('laboral en un destino: primero entra y al irse sale', () => {
    const base = { tipo: TIPO_LABORAL, origen: 2, ubicacion: 4 };
    expect(estadoDeChecada({ ...base, checadasPrevias: 0 })).toBe(ESTADO_ENTRADA);
    expect(estadoDeChecada({ ...base, checadasPrevias: 1 })).toBe(ESTADO_SALIDA);
  });
});

describe('UBICACION_POR_TERMINAL', () => {
  it('el checador de Matamoros es la ubicación de Matamoros, no Santander', () => {
    expect(UBICACION_POR_TERMINAL['D1-PER-OSFEM-MAT']).toBe(2);
  });
});
