import { Component, computed, input } from '@angular/core';

const TRAZOS = {
  hoy: 'M12 7v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  salidas: 'M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3 M16 17l5-5-5-5 M21 12H9',
  validar: 'M9 12l2 2 4-4 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  reportes: 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2',
  ajustes: 'M4 7h10 M18 7h2 M4 17h2 M10 17h10 M16 5v4 M8 15v4',
  cuenta: 'M20 21a8 8 0 0 0-16 0 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  salir: 'M15 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3 M10 17l-5-5 5-5 M5 12h11',
  mas: 'M12 5v14 M5 12h14',
  flecha: 'M5 12h14 M13 6l6 6-6 6',
  atras: 'M19 12H5 M11 18l-6-6 6-6',
  sol: 'M12 3v2 M12 19v2 M5.6 5.6 7 7 M17 17l1.4 1.4 M3 12h2 M19 12h2 M5.6 18.4 7 17 M17 7l1.4-1.4 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  luna: 'M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z',
  pdf: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z M14 3v5h5 M9 13h6 M9 17h6',
  descarga: 'M12 4v11 M7 11l5 5 5-5 M4 20h16',
  cerrar: 'M18 6 6 18 M6 6l12 12',
  listo: 'M5 12.5l4.5 4.5L19 7',
  edificio: 'M4 21h16 M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16 M10 8h1 M13 8h1 M10 12h1 M13 12h1 M10 21v-4h4v4',
  personal: 'M20 21a8 8 0 0 0-16 0 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  laboral: 'M4 8h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2 M3 13h18',
  comida: 'M7 3v8 M4 3v5a3 3 0 0 0 6 0V3 M7 11v10 M17 3c-2 1-3 4-3 7v3h3 M17 3v18',
} as const;

export type NombreIcono = keyof typeof TRAZOS;

@Component({
  selector: 'app-icono',
  template: `<svg
    [attr.width]="tamano()"
    [attr.height]="tamano()"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path [attr.d]="trazo()" />
  </svg>`,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }
  `,
})
export class Icono {
  readonly nombre = input.required<NombreIcono>();
  readonly tamano = input(20);
  protected readonly trazo = computed(() => TRAZOS[this.nombre()]);
}
