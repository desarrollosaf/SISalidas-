import { Location } from '@angular/common';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { ApiService, mensajeDeError, PermisoDetalle } from '../../../core/services/api.service';
import { AvisosService } from '../../../core/services/avisos.service';
import { claseEstado, etiquetaEstado, sinRespuesta } from '../../../shared/fila-permiso/fila-permiso';
import { Icono } from '../../../shared/icono/icono';
import { Regla } from '../../../shared/regla/regla';
import { abrirPdf, duracion, fechaCorta, fechaLarga } from '../../../shared/tiempo';

interface Evento {
  etiqueta: string;
  hora: string | null;
  nota?: string;
  /** cumplido: ya pasó. espera: todavía no. */
  estado: 'cumplido' | 'espera' | 'negativo';
}

/** La hora; con la fecha si ocurrió otro día que el del permiso (se suele solicitar antes). */
function momento(fechaHora: string | null, diaPermiso: string): string | null {
  if (!fechaHora) return null;
  const hora = fechaHora.slice(11, 16);
  return fechaHora.startsWith(diaPermiso) ? hora : `${fechaCorta(fechaHora)}, ${hora}`;
}

@Component({
  selector: 'app-detalle-salida',
  imports: [Regla, Icono],
  templateUrl: './detalle.html',
  styleUrl: './detalle.scss',
})
export class DetalleSalida implements OnInit {
  private readonly api = inject(ApiService);
  private readonly avisos = inject(AvisosService);
  private readonly ubicacion = inject(Location);

  /** Viene de la ruta salidas/:id. */
  readonly id = input.required<string>();

  protected readonly permiso = signal<PermisoDetalle | null>(null);
  protected readonly error = signal('');
  protected readonly ocupado = signal(false);
  protected readonly duracion = duracion;
  protected readonly etiquetaEstado = etiquetaEstado;
  protected readonly claseEstado = claseEstado;

  protected readonly fecha = computed(() => {
    const p = this.permiso();
    return p ? fechaLarga(p.fecha) : '';
  });

  protected readonly excedido = computed(() => {
    const p = this.permiso();
    if (p?.minutosOcupados == null || p.minutosSolicitados == null) return 0;
    return Math.max(p.minutosOcupados - p.minutosSolicitados, 0);
  });

  /** La historia del permiso, de la solicitud al regreso. */
  protected readonly bitacora = computed<Evento[]>(() => {
    const p = this.permiso();
    if (!p) return [];
    const eventos: Evento[] = [
      { etiqueta: 'Solicitud enviada', hora: momento(p.solicitadoEl, p.fecha), estado: 'cumplido' },
    ];
    if (sinRespuesta(p)) {
      eventos.push({ etiqueta: 'Se cerró sin respuesta', hora: null, estado: 'espera' });
      return eventos;
    }
    if (p.estado === 'pendiente') {
      eventos.push({ etiqueta: 'Esperando validación', hora: null, estado: 'espera' });
    } else if (p.estado === 'aprobado') {
      eventos.push({ etiqueta: 'Aprobada', hora: momento(p.resueltoEl, p.fecha), estado: 'cumplido' });
    } else {
      eventos.push({ etiqueta: 'Denegada', hora: momento(p.resueltoEl, p.fecha), estado: 'negativo' });
      return eventos;
    }
    eventos.push({
      etiqueta: 'Salida en el checador',
      hora: p.salidaRegistrada?.slice(0, 5) ?? null,
      nota: p.origen ?? undefined,
      estado: p.salidaRegistrada ? 'cumplido' : 'espera',
    });
    for (const destino of p.destinos) {
      eventos.push({
        etiqueta: destino.entrada ? `Llegó a destino` : 'Destino',
        hora: destino.entrada?.slice(0, 5) ?? null,
        nota: destino.salida
          ? `${destino.nombre} · salió a las ${destino.salida.slice(0, 5)}`
          : destino.nombre,
        estado: destino.entrada ? 'cumplido' : 'espera',
      });
    }
    if (p.regresa) {
      eventos.push({
        etiqueta: 'Regreso en el checador',
        hora: p.entradaRegistrada?.slice(0, 5) ?? null,
        estado: p.entradaRegistrada ? 'cumplido' : 'espera',
      });
    }
    return eventos;
  });

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.api.permiso(Number(this.id())).subscribe({
      next: (permiso) => this.permiso.set(permiso),
      error: (error) => this.error.set(mensajeDeError(error)),
    });
  }

  protected volver(): void {
    this.ubicacion.back();
  }

  protected verPdf(): void {
    const p = this.permiso()!;
    this.api.pdfPermiso(p.id).subscribe({
      next: (blob) => abrirPdf(blob, `permiso-${p.id}.pdf`),
      error: (error) => this.avisos.error(mensajeDeError(error)),
    });
  }

  protected async cerrar(): Promise<void> {
    const acepto = await this.avisos.confirmar({
      titulo: '¿Cerrar este permiso?',
      texto: 'Las siguientes checadas ya no se contarán como parte de esta salida.',
      accion: 'Cerrar permiso',
      peligro: true,
    });
    if (!acepto) return;
    this.ocupado.set(true);
    this.api.cerrarPermiso(this.permiso()!.id).subscribe({
      next: () => {
        this.avisos.exito('Permiso cerrado');
        this.ocupado.set(false);
        this.cargar();
      },
      error: (error) => {
        this.avisos.error(mensajeDeError(error));
        this.ocupado.set(false);
      },
    });
  }

  protected async decidir(aprobar: boolean): Promise<void> {
    if (!aprobar) {
      const acepto = await this.avisos.confirmar({
        titulo: '¿Denegar esta salida?',
        texto: 'La persona recibirá un correo con la resolución y el permiso quedará cerrado.',
        accion: 'Denegar',
        peligro: true,
      });
      if (!acepto) return;
    }
    this.ocupado.set(true);
    this.api.decidir(this.permiso()!.id, aprobar).subscribe({
      next: () => {
        this.avisos.exito(aprobar ? 'Salida aprobada' : 'Salida denegada');
        this.ocupado.set(false);
        this.cargar();
      },
      error: (error) => {
        this.avisos.error(mensajeDeError(error));
        this.ocupado.set(false);
      },
    });
  }
}
