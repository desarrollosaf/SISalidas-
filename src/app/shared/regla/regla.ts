import { Component, computed, ElementRef, input, model, viewChild } from '@angular/core';
import { aHora, aMinutos, JORNADA_FIN, JORNADA_INICIO } from '../tiempo';

const PASO = 5;
const PASO_TECLADO = 15;
const DURACION_MINIMA = 15;
const ANCHO_ETIQUETA = 62;
const HORAS = Array.from({ length: 10 }, (_, i) => 9 + i);

type Arrastre = { modo: 'salida' | 'regreso' | 'bloque'; desde: number; salida: number; regreso: number };

const limitar = (valor: number, min: number, max: number) => Math.min(max, Math.max(min, valor));
const aPorcentaje = (minutos: number) =>
  ((limitar(minutos, JORNADA_INICIO, JORNADA_FIN) - JORNADA_INICIO) /
    (JORNADA_FIN - JORNADA_INICIO)) *
  100;

/**
 * La regla de jornada: la pieza central del sistema. Pinta de 9:00 a 18:00 el tiempo solicitado y,
 * debajo, lo que de verdad registró el checador. Con `editable` se arrastra para elegir el horario.
 */
@Component({
  selector: 'app-regla',
  templateUrl: './regla.html',
  styleUrl: './regla.scss',
  host: { '[class.compacta]': 'compacta()' },
})
export class Regla {
  readonly salida = model<string>('12:00');
  readonly regreso = model<string | null>(null);
  readonly regresa = input(true);
  readonly salidaReal = input<string | null>(null);
  readonly entradaReal = input<string | null>(null);
  readonly ahora = input<string | null>(null);
  readonly editable = input(false);
  readonly compacta = input(false);
  /** pendiente | aprobado | denegado | editando */
  readonly tono = input<string>('aprobado');

  protected readonly horas = HORAS;
  private readonly pista = viewChild<ElementRef<HTMLElement>>('pista');
  private arrastre: Arrastre | null = null;

  /** El bloque es tan angosto que las dos etiquetas de hora se encimarían. */
  protected readonly etiquetasJuntas = computed(() => {
    const ancho = this.pista()?.nativeElement.clientWidth ?? 0;
    return !!ancho && (this.bloque().width / 100) * ancho < ANCHO_ETIQUETA;
  });

  protected readonly bloque = computed(() => {
    const inicio = aPorcentaje(aMinutos(this.salida()));
    const regreso = this.regreso();
    const fin = this.regresa() && regreso ? aPorcentaje(aMinutos(regreso)) : 100;
    return { left: inicio, width: Math.max(fin - inicio, 0.6) };
  });

  protected readonly real = computed(() => {
    const salida = this.salidaReal();
    if (!salida) return null;
    const inicio = aPorcentaje(aMinutos(salida));
    const entrada = this.entradaReal();
    const fin = entrada ? aPorcentaje(aMinutos(entrada)) : inicio;
    return { left: inicio, width: Math.max(fin - inicio, 0), abierto: !entrada };
  });

  protected readonly posicionAhora = computed(() => {
    const ahora = this.ahora();
    if (!ahora) return null;
    const minutos = aMinutos(ahora);
    return minutos >= JORNADA_INICIO && minutos <= JORNADA_FIN ? aPorcentaje(minutos) : null;
  });

  protected readonly descripcion = computed(() => {
    const regreso = this.regresa() && this.regreso() ? ` a ${this.regreso()}` : ', sin regreso';
    return `Salida de ${this.salida()}${regreso}, dentro de la jornada de 9:00 a 18:00`;
  });

  private minutosEn(evento: PointerEvent): number {
    const caja = this.pista()!.nativeElement.getBoundingClientRect();
    const proporcion = (evento.clientX - caja.left) / caja.width;
    const minutos = JORNADA_INICIO + proporcion * (JORNADA_FIN - JORNADA_INICIO);
    return limitar(Math.round(minutos / PASO) * PASO, JORNADA_INICIO, JORNADA_FIN);
  }

  protected iniciar(evento: PointerEvent, modo: Arrastre['modo']): void {
    if (!this.editable()) return;
    evento.preventDefault();
    evento.stopPropagation();
    this.pista()!.nativeElement.setPointerCapture(evento.pointerId);
    this.arrastre = {
      modo,
      desde: this.minutosEn(evento),
      salida: aMinutos(this.salida()),
      regreso: aMinutos(this.regreso() ?? aHora(JORNADA_FIN)),
    };
  }

  /** Un toque en la pista vacía mueve hacia ahí el extremo más cercano. */
  protected tocarPista(evento: PointerEvent): void {
    if (!this.editable()) return;
    const minutos = this.minutosEn(evento);
    const regreso = this.regreso();
    const haciaRegreso =
      this.regresa() &&
      !!regreso &&
      Math.abs(minutos - aMinutos(regreso)) < Math.abs(minutos - aMinutos(this.salida()));
    this.iniciar(evento, haciaRegreso ? 'regreso' : 'salida');
    this.aplicar(evento);
  }

  protected mover(evento: PointerEvent): void {
    if (this.arrastre) this.aplicar(evento);
  }

  protected soltar(): void {
    this.arrastre = null;
  }

  private aplicar(evento: PointerEvent): void {
    const arrastre = this.arrastre!;
    const minutos = this.minutosEn(evento);
    const conRegreso = this.regresa() && this.regreso() !== null;

    if (arrastre.modo === 'bloque') {
      const largo = arrastre.regreso - arrastre.salida;
      const salida = limitar(
        arrastre.salida + (minutos - arrastre.desde),
        JORNADA_INICIO,
        JORNADA_FIN - largo,
      );
      this.salida.set(aHora(salida));
      this.regreso.set(aHora(salida + largo));
    } else if (arrastre.modo === 'salida') {
      const tope = conRegreso ? aMinutos(this.regreso()!) - DURACION_MINIMA : JORNADA_FIN;
      this.salida.set(aHora(Math.min(minutos, tope)));
    } else {
      this.regreso.set(aHora(Math.max(minutos, aMinutos(this.salida()) + DURACION_MINIMA)));
    }
  }

  protected teclaSalida(evento: KeyboardEvent): void {
    const delta = this.deltaDeTecla(evento);
    if (!delta) return;
    const tope = this.regresa() && this.regreso() ? aMinutos(this.regreso()!) - DURACION_MINIMA : JORNADA_FIN;
    this.salida.set(aHora(limitar(aMinutos(this.salida()) + delta, JORNADA_INICIO, tope)));
  }

  protected teclaRegreso(evento: KeyboardEvent): void {
    const delta = this.deltaDeTecla(evento);
    if (!delta) return;
    const piso = aMinutos(this.salida()) + DURACION_MINIMA;
    this.regreso.set(aHora(limitar(aMinutos(this.regreso()!) + delta, piso, JORNADA_FIN)));
  }

  private deltaDeTecla(evento: KeyboardEvent): number {
    const delta =
      evento.key === 'ArrowLeft' || evento.key === 'ArrowDown'
        ? -PASO_TECLADO
        : evento.key === 'ArrowRight' || evento.key === 'ArrowUp'
          ? PASO_TECLADO
          : 0;
    if (delta) evento.preventDefault();
    return delta;
  }
}
