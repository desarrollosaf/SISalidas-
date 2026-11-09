import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Permiso } from '../../core/services/api.service';
import { Regla } from '../regla/regla';
import { diaDelMes, diaSemanaCorto, mesDe } from '../tiempo';

const ETIQUETA_ESTADO = { pendiente: 'Pendiente', aprobado: 'Aprobado', denegado: 'Denegado' };

/** Se cerró sin que nadie respondiera: ya no está "pendiente" de nada. La base trae unos 30 mil. */
export const sinRespuesta = (p: Permiso) => p.estado === 'pendiente' && !p.activo;

export const etiquetaEstado = (p: Permiso) =>
  sinRespuesta(p) ? 'Sin respuesta' : ETIQUETA_ESTADO[p.estado];

/** Clase del punto de color y tono de la regla; lo cerrado sin respuesta va en gris. */
export const claseEstado = (p: Permiso) => (sinRespuesta(p) ? 'denegado' : p.estado);

/** Un permiso en una lista: fecha, tipo, regla de jornada y estado. */
@Component({
  selector: 'app-fila-permiso',
  imports: [RouterLink, Regla],
  template: `
    <a class="fila" [routerLink]="['/salidas', permiso().id]">
      <span class="dia">
        <span class="numero">{{ dia() }}</span>
        <span class="semana">{{ semana() }}</span>
      </span>
      <span class="datos">
        <span class="linea">
          <strong>{{ permiso().tipoNombre }}</strong>
          <span class="hora apagado">
            {{ permiso().horaSalida }}
            @if (permiso().regresa) {
              – {{ permiso().horaRegreso }}
            }
          </span>
        </span>
        @if (mostrarNombre()) {
          <span class="chico apagado nombre">{{ permiso().nombre }}</span>
        } @else if (mesVisible()) {
          <span class="chico apagado">{{ mes() }}</span>
        }
      </span>
      <span class="regla">
        <app-regla
          [compacta]="true"
          [salida]="permiso().horaSalida"
          [regreso]="permiso().horaRegreso"
          [regresa]="permiso().regresa"
          [salidaReal]="permiso().salidaRegistrada"
          [entradaReal]="permiso().entradaRegistrada"
          [tono]="clase()"
        />
      </span>
      <span class="estado" [class]="clase()">{{ etiqueta() }}</span>
    </a>
  `,
  styles: `
    .fila {
      display: grid;
      grid-template-columns: 44px minmax(120px, 1fr) minmax(140px, 1.3fr) 84px;
      align-items: center;
      gap: 14px;
      padding: 14px 8px;
      margin: 0 -8px;
      border-bottom: 1px solid var(--linea);
      border-radius: 10px;
      color: inherit;
      text-decoration: none;
      transition: background-color 0.15s ease;
    }
    .fila:hover {
      background: var(--fondo-2);
    }
    .dia {
      display: flex;
      flex-direction: column;
      align-items: center;
      line-height: 1.1;
    }
    .numero {
      font-family: var(--serif);
      font-size: 1.625rem;
    }
    .semana {
      color: var(--apagado);
      font-size: 0.75rem;
    }
    .datos,
    .linea {
      display: flex;
      min-width: 0;
    }
    .datos {
      flex-direction: column;
    }
    .linea {
      flex-wrap: wrap;
      gap: 0 10px;
      align-items: baseline;
    }
    strong {
      font-weight: 600;
    }
    .nombre {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .estado {
      justify-content: flex-end;
    }
    @media (max-width: 620px) {
      .fila {
        grid-template-columns: 44px minmax(0, 1fr) auto;
      }
      .regla {
        grid-column: 2 / -1;
        grid-row: 2;
      }
    }
  `,
})
export class FilaPermiso {
  readonly permiso = input.required<Permiso>();
  readonly mostrarNombre = input(false);
  readonly mesVisible = input(false);

  protected readonly dia = computed(() => diaDelMes(this.permiso().fecha));
  protected readonly semana = computed(() => diaSemanaCorto(this.permiso().fecha));
  protected readonly mes = computed(() => mesDe(this.permiso().fecha));
  protected readonly etiqueta = computed(() => etiquetaEstado(this.permiso()));
  protected readonly clase = computed(() => claseEstado(this.permiso()));
}
