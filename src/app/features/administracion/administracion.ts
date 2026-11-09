import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ApiService,
  AsignacionRol,
  Jefe,
  mensajeDeError,
  Validador,
} from '../../core/services/api.service';
import { AvisosService } from '../../core/services/avisos.service';
import { Buscador, OpcionBuscador } from '../../shared/buscador/buscador';
import { Icono } from '../../shared/icono/icono';

type Pestana = 'validadores' | 'jefes' | 'roles';

@Component({
  selector: 'app-administracion',
  imports: [FormsModule, Buscador, Icono],
  templateUrl: './administracion.html',
  styleUrl: './administracion.scss',
})
export class Administracion implements OnInit {
  private readonly api = inject(ApiService);
  private readonly avisos = inject(AvisosService);

  protected readonly pestana = signal<Pestana>('validadores');
  protected readonly validadores = signal<Validador[]>([]);
  protected readonly jefes = signal<Jefe[]>([]);
  protected readonly asignaciones = signal<AsignacionRol[]>([]);
  protected readonly catalogoRoles = signal<{ clave: string; nombre: string }[]>([]);
  protected readonly personas = signal<OpcionBuscador[]>([]);
  protected readonly departamentos = signal<OpcionBuscador[]>([]);
  protected readonly error = signal('');
  protected readonly ocupado = signal(false);

  protected readonly nuevoRfc = signal('');
  protected readonly nuevoDepartamento = signal('');
  protected readonly rolRfc = signal('');
  protected readonly rolClave = signal('');
  protected readonly filtroJefes = signal('');

  protected readonly jefesVisibles = computed(() => {
    const termino = this.filtroJefes().trim().toLowerCase();
    return this.jefes().filter(
      (j) =>
        !termino ||
        j.nombre.toLowerCase().includes(termino) ||
        j.departamento.toLowerCase().includes(termino),
    );
  });

  ngOnInit(): void {
    this.cargarValidadores();
    this.cargarRoles();
    this.api.opcionesValidador().subscribe({
      next: ({ personas, departamentos }) => {
        this.personas.set(personas.map((p) => ({ valor: p.rfc, texto: p.nombre })));
        this.departamentos.set(departamentos.map((d) => ({ valor: String(d.id), texto: d.nombre })));
      },
      error: (error) => this.error.set(mensajeDeError(error)),
    });
  }

  private cargarValidadores(): void {
    this.api.validadores().subscribe({
      next: ({ validadores, jefes }) => {
        this.validadores.set(validadores);
        this.jefes.set(jefes);
      },
      error: (error) => this.error.set(mensajeDeError(error)),
    });
  }

  private cargarRoles(): void {
    this.api.roles().subscribe({
      next: ({ catalogo, asignaciones }) => {
        this.catalogoRoles.set(catalogo);
        this.asignaciones.set(asignaciones);
      },
      error: (error) => this.error.set(mensajeDeError(error)),
    });
  }

  protected agregarValidador(): void {
    if (!this.nuevoRfc() || !this.nuevoDepartamento()) return;
    this.ocupado.set(true);
    this.api.crearValidador(this.nuevoRfc(), Number(this.nuevoDepartamento())).subscribe({
      next: () => {
        this.nuevoRfc.set('');
        this.nuevoDepartamento.set('');
        this.ocupado.set(false);
        this.avisos.exito('Validador agregado');
        this.cargarValidadores();
      },
      error: (error) => {
        this.ocupado.set(false);
        this.avisos.error(mensajeDeError(error));
      },
    });
  }

  protected async quitarValidador(validador: Validador): Promise<void> {
    const acepto = await this.avisos.confirmar({
      titulo: '¿Quitar este validador?',
      texto: `${validador.nombre} dejará de autorizar ${validador.departamento}.`,
      accion: 'Quitar',
      peligro: true,
    });
    if (!acepto) return;
    this.api.quitarValidador(validador.id).subscribe({
      next: () => {
        this.avisos.exito('Validador quitado');
        this.cargarValidadores();
      },
      error: (error) => this.avisos.error(mensajeDeError(error)),
    });
  }

  protected asignarRol(): void {
    if (!this.rolRfc() || !this.rolClave()) return;
    this.ocupado.set(true);
    this.api.asignarRol(this.rolRfc(), this.rolClave()).subscribe({
      next: () => {
        this.rolRfc.set('');
        this.rolClave.set('');
        this.ocupado.set(false);
        this.avisos.exito('Rol asignado. Aplica la próxima vez que esa persona entre.');
        this.cargarRoles();
      },
      error: (error) => {
        this.ocupado.set(false);
        this.avisos.error(mensajeDeError(error));
      },
    });
  }

  protected async quitarRol(asignacion: AsignacionRol): Promise<void> {
    const acepto = await this.avisos.confirmar({
      titulo: '¿Quitar este rol?',
      texto: `${asignacion.nombre} dejará de ser "${asignacion.rolNombre}".`,
      accion: 'Quitar',
      peligro: true,
    });
    if (!acepto) return;
    this.api.quitarRol(asignacion.rfc).subscribe({
      next: () => {
        this.avisos.exito('Rol quitado');
        this.cargarRoles();
      },
      error: (error) => this.avisos.error(mensajeDeError(error)),
    });
  }
}
