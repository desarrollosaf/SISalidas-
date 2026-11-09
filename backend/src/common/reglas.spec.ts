import {
  erroresSolicitud,
  esJefe,
  minutosEntre,
  rangoPorClave,
  textoFolio,
  TIPO_COMIDA,
  TIPO_LABORAL,
  TIPO_PERSONAL,
} from './reglas';

const HOY = '2026-11-06';
const base = {
  fecha_permiso: HOY,
  hora_salida: '12:00',
  regresa: true,
  hora_regreso: '13:00',
  tipo_permiso: TIPO_PERSONAL,
};

describe('esJefe', () => {
  it('en OSFEM manda hasta el rango 4', () => {
    expect(esJefe(3, 4)).toBe(true);
    expect(esJefe(3, 5)).toBe(false);
  });
  it('en otras dependencias manda hasta el rango 3', () => {
    expect(esJefe(1, 3)).toBe(true);
    expect(esJefe(1, 4)).toBe(false);
  });
  it('sin rango no manda', () => {
    expect(esJefe(3, null)).toBe(false);
  });
});

describe('rangoPorClave', () => {
  it.each([
    [30001, 1],
    [31001, 2],
    [31011, 3],
    [31012, 4],
  ])('la clave %s es rango %s', (clave, rango) => {
    expect(rangoPorClave(clave)).toBe(rango);
  });
});

describe('textoFolio', () => {
  it('usa una letra por tipo y el año del permiso', () => {
    expect(textoFolio('AAAA000000', TIPO_PERSONAL, 7, '2025-01-02')).toBe('AAAA000000/P/7/2025');
    expect(textoFolio('AAAA000000', TIPO_LABORAL, 7, '2025-01-02')).toBe('AAAA000000/L/7/2025');
    expect(textoFolio('AAAA000000', TIPO_COMIDA, 7, '2025-01-02')).toBe('AAAA000000/C/7/2025');
  });
});

describe('erroresSolicitud', () => {
  it('acepta una solicitud correcta', () => {
    expect(erroresSolicitud(base, HOY)).toEqual([]);
  });
  it('rechaza fechas pasadas y las de más de un año', () => {
    expect(erroresSolicitud({ ...base, fecha_permiso: '2026-11-05' }, HOY)).toHaveLength(1);
    expect(erroresSolicitud({ ...base, fecha_permiso: '5025-05-06' }, HOY)).toHaveLength(1);
    expect(erroresSolicitud({ ...base, fecha_permiso: '2027-11-06' }, HOY)).toEqual([]);
  });
  it('exige la jornada de 9:00 a 18:00, con los extremos incluidos', () => {
    expect(erroresSolicitud({ ...base, hora_salida: '08:59' }, HOY)).toHaveLength(1);
    expect(
      erroresSolicitud({ ...base, hora_salida: '09:00', hora_regreso: '18:00' }, HOY),
    ).toEqual([]);
    expect(erroresSolicitud({ ...base, hora_regreso: '18:01' }, HOY)).toHaveLength(1);
  });
  it('exige que el regreso sea posterior a la salida', () => {
    expect(erroresSolicitud({ ...base, hora_regreso: '12:00' }, HOY)).toHaveLength(1);
    expect(erroresSolicitud({ ...base, hora_regreso: null }, HOY)).toHaveLength(1);
  });
  it('sin regreso no exige hora de regreso', () => {
    expect(erroresSolicitud({ ...base, regresa: false, hora_regreso: null }, HOY)).toEqual([]);
  });
  it('un permiso laboral necesita origen permitido y destino', () => {
    const laboral = { ...base, tipo_permiso: TIPO_LABORAL };
    expect(erroresSolicitud(laboral, HOY)).toHaveLength(2);
    expect(erroresSolicitud({ ...laboral, origen: 1, destinos: [3] }, HOY)).toHaveLength(1);
    expect(erroresSolicitud({ ...laboral, origen: 2, destinos: [3] }, HOY)).toEqual([]);
  });
  it('el destino "otro" necesita texto', () => {
    const laboral = { ...base, tipo_permiso: TIPO_LABORAL, origen: 2, destinos: [999] };
    expect(erroresSolicitud(laboral, HOY)).toHaveLength(1);
    expect(erroresSolicitud({ ...laboral, otro: 'Banco' }, HOY)).toEqual([]);
  });
});

describe('minutosEntre', () => {
  it('calcula con y sin segundos', () => {
    expect(minutosEntre('12:00', '13:30')).toBe(90);
    expect(minutosEntre('12:00:00', '12:45:00')).toBe(45);
  });
  it('sin alguna hora no hay dato', () => {
    expect(minutosEntre('12:00', null)).toBeNull();
  });
});
