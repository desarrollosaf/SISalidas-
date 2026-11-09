import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, mensajeDeError, Permiso } from '../../core/services/api.service';
import { AvisosService } from '../../core/services/avisos.service';
import { Icono } from '../../shared/icono/icono';
import { Regla } from '../../shared/regla/regla';
import { duracion, fechaRelativa } from '../../shared/tiempo';

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

const plural = (n: number, uno: string, varios: string) => (n === 1 ? `1 ${uno}` : `${n} ${varios}`);

@Component({
  selector: 'app-validar',
  imports: [RouterLink, Regla, Icono],
  templateUrl: './validar.html',
  styleUrl: './validar.scss',
})
export class Validar implements OnInit {
  private readonly api = inject(ApiService);
  private readonly avisos = inject(AvisosService);

  protected readonly permisos = signal<Permiso[] | null>(null);
  protected readonly error = signal('');
  protected readonly enCurso = signal<number | null>(null);
  protected readonly aprobandoTodas = signal(false);
  protected readonly resueltas = signal(0);
  protected readonly busqueda = signal('');
  protected readonly fechaRelativa = fechaRelativa;
  protected readonly duracion = duracion;

  /** Busca por nombre, área, tipo, destino, fecha o folio, sin importar acentos. */
  protected readonly visibles = computed(() => {
    const lista = this.permisos() ?? [];
    const palabras = normalizar(this.busqueda()).split(/\s+/).filter(Boolean);
    if (!palabras.length) return lista;
    return lista.filter((p) => {
      const texto = normalizar(
        [
          p.nombre,
          p.departamento,
          p.direccion,
          p.tipoNombre,
          p.folio,
          p.fecha,
          fechaRelativa(p.fecha),
          p.origen,
          ...p.destinos.map((d) => d.nombre),
        ]
          .filter(Boolean)
          .join(' '),
      );
      return palabras.every((palabra) => texto.includes(palabra));
    });
  });

  protected readonly filtrando = computed(() => normalizar(this.busqueda()) !== '');

  protected readonly subtitulo = computed(() => {
    const total = this.permisos()?.length ?? 0;
    const base = plural(total, 'solicitud por resolver', 'solicitudes por resolver');
    if (!this.filtrando()) return base;
    return `${this.visibles().length} de ${base}`;
  });

  protected readonly ocupado = computed(() => this.aprobandoTodas() || this.enCurso() !== null);

  ngOnInit(): void {
    this.api.pendientes().subscribe({
      next: (lista) => this.permisos.set(lista),
      error: (error) => this.error.set(mensajeDeError(error)),
    });
  }

  protected async decidir(permiso: Permiso, aprobar: boolean): Promise<void> {
    if (!aprobar) {
      const acepto = await this.avisos.confirmar({
        titulo: '¿Denegar esta salida?',
        texto: `${permiso.nombre} recibirá un correo con la resolución.`,
        accion: 'Denegar',
        peligro: true,
      });
      if (!acepto) return;
    }
    this.enCurso.set(permiso.id);
    this.api.decidir(permiso.id, aprobar).subscribe({
      next: () => {
        this.quitar([permiso.id]);
        this.enCurso.set(null);
        this.avisos.exito(aprobar ? 'Salida aprobada' : 'Salida denegada');
      },
      error: (error) => {
        this.avisos.error(mensajeDeError(error));
        this.enCurso.set(null);
      },
    });
  }

  /** Aprueba todas las solicitudes visibles: si hay búsqueda, solo las que coinciden. */
  protected async aprobarTodas(): Promise<void> {
    const objetivo = this.visibles();
    if (!objetivo.length || this.ocupado()) return;

    const cuantas = plural(objetivo.length, 'solicitud', 'solicitudes');
    const acepto = await this.avisos.confirmar({
      titulo: this.filtrando() ? `¿Aprobar ${cuantas} de la búsqueda?` : `¿Aprobar ${cuantas}?`,
      texto: 'Cada persona recibirá un correo con la resolución. Una decisión es definitiva.',
      accion: 'Aprobar',
    });
    if (!acepto) return;

    this.aprobandoTodas.set(true);
    this.api.aprobarVarias(objetivo.map((p) => p.id)).subscribe({
      next: ({ aprobadas, fallidas }) => {
        this.quitar(aprobadas);
        this.aprobandoTodas.set(false);
        if (aprobadas.length) {
          this.avisos.exito(
            plural(aprobadas.length, 'salida aprobada', 'salidas aprobadas'),
          );
        }
        if (fallidas.length) {
          this.avisos.error(
            `${plural(fallidas.length, 'solicitud no se pudo', 'solicitudes no se pudieron')} aprobar: ${fallidas[0].mensaje}`,
          );
        }
        if (!this.visibles().length) this.busqueda.set('');
      },
      error: (error) => {
        this.avisos.error(mensajeDeError(error));
        this.aprobandoTodas.set(false);
      },
    });
  }

  private quitar(ids: number[]): void {
    const fuera = new Set(ids);
    this.permisos.update((lista) => lista?.filter((p) => !fuera.has(p.id)) ?? null);
    this.resueltas.update((n) => n + ids.length);
  }
}
