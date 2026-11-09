import { Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { mensajeDeError } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Regla } from '../../shared/regla/regla';
import { fechaLarga, hoyMexico, JORNADA_FIN, JORNADA_INICIO } from '../../shared/tiempo';

const RELOJ = new Intl.DateTimeFormat('es-MX', {
  timeZone: 'America/Mexico_City',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

@Component({
  selector: 'app-login',
  imports: [FormsModule, Regla],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Viene en la URL cuando la sesión terminó sola: "sesion" o "inactividad". */
  readonly motivo = input<string>();

  protected readonly rfc = signal('');
  protected readonly contrasena = signal('');
  protected readonly verContrasena = signal(false);
  protected readonly enviando = signal(false);
  protected readonly error = signal('');

  /** Reloj de checador, en hora de México. "HH:MM:SS". */
  private readonly ahora = signal(RELOJ.format(new Date()));
  protected readonly hora = computed(() => this.ahora().slice(0, 5));
  protected readonly segundos = computed(() => this.ahora().slice(5));
  /** Se recalcula con el minuto, así cambia sola a medianoche. */
  protected readonly fecha = computed(() => {
    this.hora();
    return fechaLarga(hoyMexico());
  });
  /** La marca de "ahora" en la regla, solo dentro de la jornada. */
  protected readonly ahoraJornada = computed(() => {
    const hora = this.hora();
    const [h, m] = hora.split(':').map(Number);
    const minutos = h * 60 + m;
    return minutos >= JORNADA_INICIO && minutos <= JORNADA_FIN ? hora : null;
  });

  constructor() {
    const id = setInterval(() => this.ahora.set(RELOJ.format(new Date())), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }

  protected entrar(): void {
    if (!this.rfc().trim() || !this.contrasena() || this.enviando()) return;
    this.enviando.set(true);
    this.error.set('');
    this.auth.login(this.rfc(), this.contrasena()).subscribe({
      next: () => void this.router.navigate(['/hoy']),
      error: (error) => {
        this.error.set(mensajeDeError(error));
        this.enviando.set(false);
      },
    });
  }
}
