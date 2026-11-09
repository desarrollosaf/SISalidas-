import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, mensajeDeError, MisPermisos, Permiso } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Icono } from '../../shared/icono/icono';
import { FilaPermiso } from '../../shared/fila-permiso/fila-permiso';
import { Regla } from '../../shared/regla/regla';
import { duracion, fechaLarga, fechaRelativa, horaActualMexico, hoyMexico } from '../../shared/tiempo';

const RECIENTES = 4;

@Component({
  selector: 'app-hoy',
  imports: [RouterLink, Regla, Icono, FilaPermiso],
  templateUrl: './hoy.html',
  styleUrl: './hoy.scss',
})
export class Hoy implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  protected readonly datos = signal<MisPermisos | null>(null);
  protected readonly pendientes = signal<Permiso[]>([]);
  protected readonly error = signal('');
  protected readonly ahora = signal(horaActualMexico());
  private reloj: ReturnType<typeof setInterval> | null = null;

  protected readonly fecha = fechaLarga(hoyMexico());
  protected readonly fechaRelativa = fechaRelativa;
  protected readonly duracion = duracion;

  protected readonly activo = computed(() => this.datos()?.activo ?? null);
  protected readonly esHoy = computed(() => this.activo()?.fecha === hoyMexico());

  protected readonly recientes = computed(() =>
    (this.datos()?.permisos ?? []).filter((p) => p.id !== this.activo()?.id).slice(0, RECIENTES),
  );

  protected readonly tiempoDelAnio = computed(() =>
    (this.datos()?.permisos ?? []).reduce((suma, p) => suma + (p.minutosOcupados ?? 0), 0),
  );

  protected readonly aprobadosDelAnio = computed(
    () => (this.datos()?.permisos ?? []).filter((p) => p.estado === 'aprobado').length,
  );

  ngOnInit(): void {
    this.api.misPermisos().subscribe({
      next: (datos) => this.datos.set(datos),
      error: (error) => this.error.set(mensajeDeError(error)),
    });
    if (this.auth.currentUser()?.capacidades.validar) {
      this.api.pendientes().subscribe({ next: (lista) => this.pendientes.set(lista) });
    }
    this.reloj = setInterval(() => this.ahora.set(horaActualMexico()), 30_000);
  }

  ngOnDestroy(): void {
    if (this.reloj) clearInterval(this.reloj);
  }
}
