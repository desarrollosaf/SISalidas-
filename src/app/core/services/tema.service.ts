import { Injectable, signal } from '@angular/core';

const CLAVE = 'salidas_tema';

/** Claro u oscuro: por omisión el del sistema, hasta que la persona elige uno. */
@Injectable({ providedIn: 'root' })
export class TemaService {
  readonly oscuro = signal(this.leerInicial());

  alternar(): void {
    const oscuro = !this.oscuro();
    this.oscuro.set(oscuro);
    const tema = oscuro ? 'oscuro' : 'claro';
    document.documentElement.dataset['tema'] = tema;
    try {
      localStorage.setItem(CLAVE, tema);
    } catch {
      // Sin almacenamiento el tema solo dura esta visita.
    }
  }

  private leerInicial(): boolean {
    const elegido = document.documentElement.dataset['tema'];
    if (elegido) return elegido === 'oscuro';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}
