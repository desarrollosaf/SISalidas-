import { Component, effect, ElementRef, inject, viewChild } from '@angular/core';
import { AvisosService } from '../../core/services/avisos.service';

/** Pinta los avisos flotantes y el diálogo de confirmación. */
@Component({
  selector: 'app-avisos',
  template: `
    <div class="pila" aria-live="polite">
      @for (aviso of servicio.avisos(); track aviso.id) {
        <div class="aviso" [class.error]="aviso.tipo === 'error'" role="status">
          {{ aviso.texto }}
        </div>
      }
    </div>

    <dialog #dialogo class="dialogo" (cancel)="responder(false)">
      @if (servicio.confirmacion(); as c) {
        <h2 class="titulo-chico">{{ c.titulo }}</h2>
        <p>{{ c.texto }}</p>
        <div class="acciones">
          <button type="button" class="boton" (click)="responder(false)">Volver</button>
          <button
            type="button"
            class="boton"
            [class.primario]="!c.peligro"
            [class.peligro]="c.peligro"
            (click)="responder(true)"
          >
            {{ c.accion }}
          </button>
        </div>
      }
    </dialog>
  `,
  styles: `
    .pila {
      position: fixed;
      z-index: 50;
      left: 50%;
      bottom: calc(88px + env(safe-area-inset-bottom));
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      width: min(92vw, 480px);
      transform: translateX(-50%);
      pointer-events: none;
    }
    .aviso {
      padding: 12px 18px;
      border-radius: 12px;
      background: var(--tinta);
      color: var(--fondo);
      font-size: 0.9375rem;
      box-shadow: 0 8px 30px rgb(0 0 0 / 18%);
      animation: subir 0.25s ease;
    }
    .aviso.error {
      background: var(--peligro);
      color: #fff;
    }
    @keyframes subir {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
    }
    .dialogo {
      width: min(92vw, 420px);
      padding: 28px;
      border: 0;
      border-radius: 18px;
      background: var(--superficie);
      color: var(--tinta);
    }
    .dialogo::backdrop {
      background: rgb(20 12 16 / 45%);
    }
    .dialogo p {
      margin: 10px 0 24px;
      color: var(--apagado);
    }
    .acciones {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
  `,
})
export class Avisos {
  protected readonly servicio = inject(AvisosService);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  constructor() {
    effect(() => {
      const elemento = this.dialogo().nativeElement;
      if (this.servicio.confirmacion()) {
        if (!elemento.open) elemento.showModal();
      } else if (elemento.open) {
        elemento.close();
      }
    });
  }

  protected responder(acepto: boolean): void {
    this.servicio.confirmacion()?.responder(acepto);
  }
}
