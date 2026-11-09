import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, mensajeDeError, Opcion } from '../../../core/services/api.service';
import { AvisosService } from '../../../core/services/avisos.service';
import { Icono, NombreIcono } from '../../../shared/icono/icono';
import { Regla } from '../../../shared/regla/regla';
import { aHora, aMinutos, fechaLarga, fechaRelativa, hoyMexico, sumarDias } from '../../../shared/tiempo';

const LABORAL = 2;
const DESTINO_OTRO = 999;
const MAX_DIAS = 365;

const TIPOS: { valor: number; texto: string; nota: string; icono: NombreIcono }[] = [
  { valor: 1, texto: 'Personal', nota: 'Un trámite tuyo', icono: 'personal' },
  { valor: 2, texto: 'Laboral', nota: 'Vas a otro edificio', icono: 'laboral' },
  { valor: 3, texto: 'Comida', nota: 'Tu hora de comida', icono: 'comida' },
];

@Component({
  selector: 'app-nueva-salida',
  imports: [FormsModule, RouterLink, Regla, Icono],
  templateUrl: './nueva.html',
  styleUrl: './nueva.scss',
})
export class NuevaSalida implements OnInit {
  private readonly api = inject(ApiService);
  private readonly avisos = inject(AvisosService);
  private readonly router = inject(Router);

  protected readonly tipos = TIPOS;
  protected readonly hoy = hoyMexico();
  protected readonly manana = sumarDias(this.hoy, 1);
  protected readonly maximo = sumarDias(this.hoy, MAX_DIAS);
  protected readonly DESTINO_OTRO = DESTINO_OTRO;

  protected readonly tipo = signal<number | null>(null);
  protected readonly fecha = signal(this.hoy);
  protected readonly salida = signal('13:00');
  protected readonly regreso = signal<string | null>('14:00');
  protected readonly regresa = signal(true);
  protected readonly origen = signal<number | null>(null);
  protected readonly destinos = signal<number[]>([]);
  protected readonly otro = signal('');
  protected readonly filtroDestino = signal('');

  protected readonly origenes = signal<Opcion[]>([]);
  protected readonly catalogoDestinos = signal<Opcion[]>([]);
  protected readonly enviando = signal(false);
  protected readonly errores = signal('');

  protected readonly esLaboral = computed(() => this.tipo() === LABORAL);
  protected readonly quiereOtro = computed(() => this.destinos().includes(DESTINO_OTRO));

  protected readonly destinosVisibles = computed(() => {
    const termino = this.filtroDestino().trim().toLowerCase();
    return this.catalogoDestinos().filter(
      (d) => !termino || d.nombre.toLowerCase().includes(termino) || this.destinos().includes(d.id),
    );
  });

  /** La solicitud en una frase: es lo que la persona confirma antes de enviar. */
  protected readonly frase = computed(() => {
    const tipo = TIPOS.find((t) => t.valor === this.tipo())?.texto ?? 'Salida';
    const cuando = fechaRelativa(this.fecha(), this.hoy);
    const horario =
      this.regresa() && this.regreso()
        ? `de ${this.salida()} a ${this.regreso()}`
        : `desde las ${this.salida()}, sin regreso`;
    return `${tipo}, ${cuando === 'Hoy' || cuando === 'Mañana' ? cuando.toLowerCase() : `el ${fechaLarga(this.fecha())}`}, ${horario}.`;
  });

  protected readonly faltante = computed(() => {
    if (!this.tipo()) return 'Elige el tipo de salida';
    if (this.fecha() < this.hoy) return 'La fecha no puede ser anterior a hoy';
    if (this.fecha() > this.maximo) return 'La fecha no puede ser de más de un año adelante';
    if (!this.dentroDeJornada(this.salida())) return 'La salida debe ser de 9:00 a 18:00';
    if (this.regresa()) {
      const regreso = this.regreso() ?? '';
      if (!this.dentroDeJornada(regreso)) return 'El regreso debe ser de 9:00 a 18:00';
      if (regreso <= this.salida()) return 'El regreso debe ser después de la salida';
    }
    if (this.esLaboral()) {
      if (!this.origen()) return 'Elige de qué edificio sales';
      if (!this.destinos().length) return 'Elige a dónde vas';
      if (this.quiereOtro() && !this.otro().trim()) return 'Escribe el otro destino';
    }
    return '';
  });

  private dentroDeJornada(hora: string): boolean {
    return hora >= '09:00' && hora <= '18:00';
  }

  /** Borrar el campo de fecha no debe dejar la solicitud sin fecha. */
  protected escribirFecha(valor: string): void {
    if (valor) this.fecha.set(valor);
  }

  ngOnInit(): void {
    this.api.ubicaciones().subscribe({
      next: ({ origenes, destinos }) => {
        this.origenes.set(origenes);
        this.catalogoDestinos.set(destinos);
      },
      error: (error) => this.errores.set(mensajeDeError(error)),
    });
  }

  protected alternarRegreso(regresa: boolean): void {
    this.regresa.set(regresa);
    if (regresa && !this.regreso()) {
      const salida = aMinutos(this.salida());
      this.regreso.set(aHora(Math.min(salida + 60, 18 * 60)));
      if (salida >= 18 * 60) this.salida.set('17:00');
    }
  }

  protected alternarDestino(id: number): void {
    this.destinos.update((lista) =>
      lista.includes(id) ? lista.filter((d) => d !== id) : [...lista, id],
    );
  }

  /** Mantiene coherente el horario cuando se escribe a mano en vez de arrastrar. */
  protected escribirSalida(valor: string): void {
    if (!valor) return;
    this.salida.set(valor);
  }

  protected escribirRegreso(valor: string): void {
    if (!valor) return;
    this.regreso.set(valor);
  }

  protected enviar(): void {
    if (this.faltante() || this.enviando()) return;
    this.enviando.set(true);
    this.errores.set('');
    this.api
      .crearPermiso({
        fecha_permiso: this.fecha(),
        hora_salida: this.salida(),
        regresa: this.regresa(),
        hora_regreso: this.regresa() ? this.regreso() : null,
        tipo_permiso: this.tipo()!,
        ...(this.esLaboral()
          ? {
              origen: this.origen(),
              destinos: this.destinos(),
              otro: this.quiereOtro() ? this.otro().trim() : null,
            }
          : {}),
      })
      .subscribe({
        next: (permiso) => {
          this.avisos.exito('Solicitud enviada a tu jefe inmediato');
          void this.router.navigate(['/salidas', permiso.id]);
        },
        error: (error) => {
          this.errores.set(mensajeDeError(error));
          this.enviando.set(false);
        },
      });
  }
}
