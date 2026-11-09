import { Injectable, signal } from '@angular/core';

export type TipoAviso = 'exito' | 'error';

export interface Aviso {
  id: number;
  texto: string;
  tipo: TipoAviso;
}

export interface Confirmacion {
  titulo: string;
  texto: string;
  accion: string;
  peligro?: boolean;
  responder: (acepto: boolean) => void;
}

/** Avisos flotantes y confirmaciones; los pinta el componente app-avisos. */
@Injectable({ providedIn: 'root' })
export class AvisosService {
  readonly avisos = signal<Aviso[]>([]);
  readonly confirmacion = signal<Confirmacion | null>(null);
  private siguiente = 0;

  exito(texto: string): void {
    this.mostrar(texto, 'exito');
  }

  error(texto: string): void {
    this.mostrar(texto, 'error');
  }

  confirmar(datos: Omit<Confirmacion, 'responder'>): Promise<boolean> {
    return new Promise((resolve) => {
      this.confirmacion.set({
        ...datos,
        responder: (acepto) => {
          this.confirmacion.set(null);
          resolve(acepto);
        },
      });
    });
  }

  quitar(id: number): void {
    this.avisos.update((lista) => lista.filter((a) => a.id !== id));
  }

  private mostrar(texto: string, tipo: TipoAviso): void {
    const id = ++this.siguiente;
    this.avisos.update((lista) => [...lista, { id, texto, tipo }]);
    setTimeout(() => this.quitar(id), tipo === 'error' ? 7000 : 4000);
  }
}
