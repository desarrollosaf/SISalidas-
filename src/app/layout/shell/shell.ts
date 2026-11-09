import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { InactivityService } from '../../core/services/inactivity.service';
import { TemaService } from '../../core/services/tema.service';
import { Icono, NombreIcono } from '../../shared/icono/icono';

interface Entrada {
  ruta: string;
  etiqueta: string;
  icono: NombreIcono;
  aviso?: boolean;
}

const INTERVALO_PENDIENTES_MS = 60_000;

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icono],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell implements OnInit, OnDestroy {
  protected readonly auth = inject(AuthService);
  protected readonly tema = inject(TemaService);
  protected readonly inactividad = inject(InactivityService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  protected readonly pendientes = signal(0);
  private temporizador: ReturnType<typeof setInterval> | null = null;

  protected readonly entradas = computed<Entrada[]>(() => {
    const puede = this.auth.currentUser()?.capacidades;
    return [
      { ruta: '/hoy', etiqueta: 'Hoy', icono: 'hoy' as const },
      { ruta: '/salidas', etiqueta: 'Salidas', icono: 'salidas' as const },
      ...(puede?.validar
        ? [{ ruta: '/validar', etiqueta: 'Validar', icono: 'validar' as const, aviso: true }]
        : []),
      ...(puede?.reportes
        ? [{ ruta: '/reportes', etiqueta: 'Reportes', icono: 'reportes' as const }]
        : []),
      ...(puede?.administrar
        ? [{ ruta: '/administracion', etiqueta: 'Admin', icono: 'ajustes' as const }]
        : []),
    ];
  });

  protected readonly iniciales = computed(() =>
    (this.auth.currentUser()?.nombre ?? '')
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0])
      .join(''),
  );

  ngOnInit(): void {
    this.inactividad.start();
    this.auth.refrescar();
    if (this.auth.currentUser()?.capacidades.validar) {
      this.contarPendientes();
      this.temporizador = setInterval(() => this.contarPendientes(), INTERVALO_PENDIENTES_MS);
    }
  }

  ngOnDestroy(): void {
    this.inactividad.stop();
    if (this.temporizador) clearInterval(this.temporizador);
  }

  private contarPendientes(): void {
    this.api.pendientes().subscribe({
      next: (lista) => this.pendientes.set(lista.length),
      error: () => undefined,
    });
  }

  protected salir(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
