import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, EstadoPermiso, mensajeDeError, MisPermisos, Permiso } from '../../../core/services/api.service';
import { FilaPermiso } from '../../../shared/fila-permiso/fila-permiso';
import { Icono } from '../../../shared/icono/icono';
import { hoyMexico, mesDe } from '../../../shared/tiempo';

type Filtro = 'todos' | EstadoPermiso;

const FILTROS: { valor: Filtro; texto: string }[] = [
  { valor: 'todos', texto: 'Todas' },
  { valor: 'pendiente', texto: 'Pendientes' },
  { valor: 'aprobado', texto: 'Aprobadas' },
  { valor: 'denegado', texto: 'Denegadas' },
];

@Component({
  selector: 'app-lista-salidas',
  imports: [RouterLink, FilaPermiso, Icono],
  templateUrl: './lista.html',
  styleUrl: './lista.scss',
})
export class ListaSalidas implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly filtros = FILTROS;
  protected readonly datos = signal<MisPermisos | null>(null);
  protected readonly error = signal('');
  protected readonly filtro = signal<Filtro>('todos');
  protected readonly anio = signal(Number(hoyMexico().slice(0, 4)));

  protected readonly tieneActivo = computed(() => !!this.datos()?.activo);

  protected readonly grupos = computed(() => {
    const filtro = this.filtro();
    const visibles = (this.datos()?.permisos ?? []).filter(
      (p) => filtro === 'todos' || p.estado === filtro,
    );
    const grupos: { mes: string; permisos: Permiso[] }[] = [];
    for (const permiso of visibles) {
      const mes = mesDe(permiso.fecha);
      const ultimo = grupos.at(-1);
      if (ultimo?.mes === mes) ultimo.permisos.push(permiso);
      else grupos.push({ mes, permisos: [permiso] });
    }
    return grupos;
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected cambiarAnio(delta: number): void {
    this.anio.update((a) => a + delta);
    this.cargar();
  }

  protected get esAnioActual(): boolean {
    return this.anio() >= Number(hoyMexico().slice(0, 4));
  }

  private cargar(): void {
    this.datos.set(null);
    this.error.set('');
    this.api.misPermisos(this.anio()).subscribe({
      next: (datos) => this.datos.set(datos),
      error: (error) => this.error.set(mensajeDeError(error)),
    });
  }
}
