import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, mensajeDeError, Perfil } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { AvisosService } from '../../core/services/avisos.service';
import { TemaService } from '../../core/services/tema.service';
import { Icono } from '../../shared/icono/icono';

@Component({
  selector: 'app-mi-cuenta',
  imports: [FormsModule, Icono],
  templateUrl: './mi-cuenta.html',
  styleUrl: './mi-cuenta.scss',
})
export class MiCuenta implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly avisos = inject(AvisosService);
  private readonly router = inject(Router);
  protected readonly tema = inject(TemaService);

  protected readonly perfil = signal<Perfil | null>(null);
  protected readonly email = signal('');
  protected readonly celular = signal('');
  protected readonly telefono = signal('');
  protected readonly guardando = signal(false);

  protected readonly actual = signal('');
  protected readonly nueva = signal('');
  protected readonly confirmacion = signal('');
  protected readonly cambiando = signal(false);

  /** La misma política que valida el backend, para que se vea mientras se escribe. */
  protected readonly reglas = computed(() => {
    const texto = this.nueva();
    return [
      { texto: '8 caracteres', ok: texto.length >= 8 },
      { texto: 'Una mayúscula', ok: /[A-Z]/.test(texto) },
      { texto: 'Una minúscula', ok: /[a-z]/.test(texto) },
      { texto: 'Un número', ok: /[0-9]/.test(texto) },
      { texto: 'Un símbolo', ok: /[^\w]/.test(texto) },
    ];
  });

  protected readonly puedeCambiar = computed(
    () =>
      !!this.actual() &&
      this.reglas().every((r) => r.ok) &&
      this.nueva() === this.confirmacion() &&
      !this.cambiando(),
  );

  ngOnInit(): void {
    this.api.perfil().subscribe({
      next: (perfil) => {
        this.perfil.set(perfil);
        this.email.set(perfil.email);
        this.celular.set(perfil.celular);
        this.telefono.set(perfil.telefono);
      },
      error: (error) => this.avisos.error(mensajeDeError(error)),
    });
  }

  protected guardarDatos(): void {
    this.guardando.set(true);
    this.api
      .guardarDatos({ email: this.email(), celular: this.celular(), telefono: this.telefono() })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.avisos.exito('Datos guardados');
        },
        error: (error) => {
          this.guardando.set(false);
          this.avisos.error(mensajeDeError(error));
        },
      });
  }

  protected cambiarContrasena(): void {
    if (!this.puedeCambiar()) return;
    this.cambiando.set(true);
    this.api.cambiarContrasena(this.actual(), this.nueva()).subscribe({
      next: () => {
        this.avisos.exito('Contraseña actualizada. Entra de nuevo.');
        this.salir();
      },
      error: (error) => {
        this.cambiando.set(false);
        this.avisos.error(mensajeDeError(error));
      },
    });
  }

  protected salir(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
