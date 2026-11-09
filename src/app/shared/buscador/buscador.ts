import { Component, computed, ElementRef, HostListener, inject, input, model, signal } from '@angular/core';

export interface OpcionBuscador {
  valor: string;
  texto: string;
}

const MAXIMO_VISIBLE = 60;
const sinAcentos = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Selector con búsqueda, para catálogos largos (personas, departamentos). */
@Component({
  selector: 'app-buscador',
  template: `
    <div class="caja" [class.abierta]="abierto()">
      <input
        class="campo"
        type="text"
        role="combobox"
        autocomplete="off"
        [attr.aria-expanded]="abierto()"
        [attr.aria-label]="etiqueta()"
        [placeholder]="textoElegido() || vacio()"
        [class.con-valor]="!!valor()"
        [value]="termino()"
        (focus)="abierto.set(true)"
        (input)="escribir($any($event.target).value)"
        (keydown.escape)="abierto.set(false)"
      />
      @if (valor()) {
        <button type="button" class="limpiar" aria-label="Quitar selección" (click)="elegir('')">
          ×
        </button>
      }
      @if (abierto()) {
        <ul class="lista" role="listbox">
          @for (opcion of visibles(); track opcion.valor) {
            <li>
              <button
                type="button"
                role="option"
                [attr.aria-selected]="opcion.valor === valor()"
                (click)="elegir(opcion.valor)"
              >
                {{ opcion.texto }}
              </button>
            </li>
          } @empty {
            <li class="nada">Sin coincidencias</li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .caja {
      position: relative;
    }
    input.con-valor::placeholder {
      color: var(--tinta);
      opacity: 1;
    }
    input {
      padding-right: 34px;
      text-overflow: ellipsis;
    }
    .limpiar {
      position: absolute;
      top: 50%;
      right: 6px;
      width: 28px;
      height: 28px;
      border: 0;
      border-radius: 50%;
      background: transparent;
      color: var(--apagado);
      font-size: 1.25rem;
      line-height: 1;
      transform: translateY(-50%);
      cursor: pointer;
    }
    .lista {
      position: absolute;
      z-index: 20;
      top: calc(100% + 6px);
      left: 0;
      right: 0;
      max-height: 280px;
      margin: 0;
      padding: 6px;
      overflow-y: auto;
      list-style: none;
      border: 1px solid var(--linea);
      border-radius: 12px;
      background: var(--superficie);
      box-shadow: 0 12px 40px rgb(0 0 0 / 12%);
    }
    .lista button {
      display: block;
      width: 100%;
      padding: 9px 10px;
      border: 0;
      border-radius: 8px;
      background: none;
      color: inherit;
      font: inherit;
      font-size: 0.9375rem;
      text-align: left;
      cursor: pointer;
    }
    .lista button:hover {
      background: var(--fondo-2);
    }
    .lista button[aria-selected='true'] {
      color: var(--vino);
      font-weight: 600;
    }
    .nada {
      padding: 10px;
      color: var(--apagado);
      font-size: 0.9375rem;
    }
  `,
})
export class Buscador {
  readonly opciones = input.required<OpcionBuscador[]>();
  readonly valor = model<string>('');
  readonly vacio = input('Todas');
  readonly etiqueta = input('Buscar');

  protected readonly abierto = signal(false);
  protected readonly termino = signal('');
  private readonly elemento = inject(ElementRef<HTMLElement>);

  protected readonly textoElegido = computed(
    () => this.opciones().find((o) => o.valor === this.valor())?.texto ?? '',
  );

  protected readonly visibles = computed(() => {
    const termino = sinAcentos(this.termino().trim());
    const lista = termino
      ? this.opciones().filter((o) => sinAcentos(o.texto).includes(termino))
      : this.opciones();
    return lista.slice(0, MAXIMO_VISIBLE);
  });

  protected escribir(texto: string): void {
    this.termino.set(texto);
    this.abierto.set(true);
  }

  protected elegir(valor: string): void {
    this.valor.set(valor);
    this.termino.set('');
    this.abierto.set(false);
  }

  @HostListener('document:pointerdown', ['$event'])
  protected fuera(evento: Event): void {
    if (this.abierto() && !this.elemento.nativeElement.contains(evento.target as Node)) {
      this.abierto.set(false);
      this.termino.set('');
    }
  }
}
