import { aHora, aMinutos, duracion, fechaLarga, fechaRelativa, sumarDias } from './tiempo';

describe('tiempo', () => {
  it('convierte horas y minutos en ambos sentidos', () => {
    expect(aMinutos('12:30')).toBe(750);
    expect(aHora(750)).toBe('12:30');
    expect(aHora(545)).toBe('09:05');
  });

  it('escribe duraciones legibles', () => {
    expect(duracion(45)).toBe('45 min');
    expect(duracion(120)).toBe('2 h');
    expect(duracion(90)).toBe('1 h 30 min');
    expect(duracion(null)).toBe('—');
  });

  it('suma días cruzando de mes y de año', () => {
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('no se adelanta ni se atrasa un día por la zona horaria', () => {
    expect(fechaLarga('2026-11-06')).toContain('6 de noviembre');
  });

  it('nombra los días cercanos', () => {
    expect(fechaRelativa('2026-11-06', '2026-11-06')).toBe('Hoy');
    expect(fechaRelativa('2026-11-07', '2026-11-06')).toBe('Mañana');
    expect(fechaRelativa('2026-11-05', '2026-11-06')).toBe('Ayer');
  });
});
