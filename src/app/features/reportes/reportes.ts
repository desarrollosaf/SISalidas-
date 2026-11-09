import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ApiService,
  FiltroReporte,
  mensajeDeError,
  OpcionesReporte,
  Permiso,
  ResultadoReporte,
} from '../../core/services/api.service';
import { AvisosService } from '../../core/services/avisos.service';
import { Buscador } from '../../shared/buscador/buscador';
import { claseEstado, etiquetaEstado } from '../../shared/fila-permiso/fila-permiso';
import { Icono } from '../../shared/icono/icono';
import { abrirPdf, duracion, fechaCorta, guardarArchivo, hoyMexico } from '../../shared/tiempo';

@Component({
  selector: 'app-reportes',
  imports: [FormsModule, RouterLink, Buscador, Icono],
  templateUrl: './reportes.html',
  styleUrl: './reportes.scss',
})
export class Reportes implements OnInit {
  private readonly api = inject(ApiService);
  private readonly avisos = inject(AvisosService);

  protected readonly etiquetaEstado = etiquetaEstado;
  protected readonly claseEstado = claseEstado;
  protected readonly duracion = duracion;
  protected readonly fechaCorta = fechaCorta;

  protected readonly inicio = signal(`${hoyMexico().slice(0, 7)}-01`);
  protected readonly fin = signal(hoyMexico());
  protected readonly direccion = signal('');
  protected readonly departamento = signal('');
  protected readonly rfc = signal('');
  protected readonly tipo = signal('');
  protected readonly estado = signal('');

  protected readonly opciones = signal<OpcionesReporte | null>(null);
  protected readonly resultado = signal<ResultadoReporte | null>(null);
  protected readonly cargando = signal(false);
  protected readonly descargando = signal<'excel' | 'pdf' | null>(null);
  protected readonly error = signal('');

  protected readonly opcionesDireccion = computed(() =>
    (this.opciones()?.direcciones ?? []).map((o) => ({ valor: String(o.id), texto: o.nombre })),
  );
  protected readonly opcionesDepartamento = computed(() =>
    (this.opciones()?.departamentos ?? []).map((o) => ({ valor: String(o.id), texto: o.nombre })),
  );
  protected readonly opcionesPersona = computed(() =>
    (this.opciones()?.personas ?? []).map((o) => ({ valor: o.rfc, texto: o.nombre })),
  );

  private get filtro(): FiltroReporte {
    return {
      inicio: this.inicio(),
      fin: this.fin(),
      direccion: this.direccion(),
      departamento: this.departamento(),
      rfc: this.rfc(),
      tipo: this.tipo(),
      estado: this.estado(),
    };
  }

  ngOnInit(): void {
    this.api.opcionesReporte().subscribe({
      next: (opciones) => this.opciones.set(opciones),
      error: (error) => this.error.set(mensajeDeError(error)),
    });
    this.consultar();
  }

  protected consultar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.api.reporte(this.filtro).subscribe({
      next: (resultado) => {
        this.resultado.set(resultado);
        this.cargando.set(false);
      },
      error: (error) => {
        this.error.set(mensajeDeError(error));
        this.cargando.set(false);
      },
    });
  }

  protected descargar(formato: 'excel' | 'pdf'): void {
    this.descargando.set(formato);
    const nombre = `permisos-${this.inicio()}-a-${this.fin()}`;
    this.api.archivoReporte(formato, this.filtro).subscribe({
      next: (blob) => {
        this.descargando.set(null);
        if (formato === 'excel') guardarArchivo(blob, `${nombre}.xlsx`);
        else abrirPdf(blob, `${nombre}.pdf`);
      },
      error: () => {
        this.descargando.set(null);
        this.avisos.error('No se pudo generar el archivo. Prueba con un periodo más corto.');
      },
    });
  }

  /** Salió más tiempo del que pidió. */
  protected excedido(p: Permiso): boolean {
    return (
      p.minutosOcupados != null &&
      p.minutosSolicitados != null &&
      p.minutosOcupados > p.minutosSolicitados
    );
  }
}
