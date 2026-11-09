import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EstadoPermiso = 'pendiente' | 'aprobado' | 'denegado';

export interface DestinoVista {
  nombre: string;
  entrada: string | null;
  salida: string | null;
}

export interface Permiso {
  id: number;
  folio: string;
  rfc: string;
  nombre: string;
  dependencia: string | null;
  direccion: string | null;
  departamento: string | null;
  tipo: number;
  tipoNombre: string;
  fecha: string;
  horaSalida: string;
  horaRegreso: string | null;
  regresa: boolean;
  estado: EstadoPermiso;
  activo: boolean;
  resueltoEl: string | null;
  solicitadoEl: string | null;
  salidaRegistrada: string | null;
  entradaRegistrada: string | null;
  minutosSolicitados: number | null;
  minutosOcupados: number | null;
  origen: string | null;
  destinos: DestinoVista[];
}

export interface PermisoDetalle extends Permiso {
  puedeValidar: boolean;
  esPropio: boolean;
}

export interface MisPermisos {
  anio: number;
  hoy: string;
  activo: Permiso | null;
  permisos: Permiso[];
}

export interface NuevoPermiso {
  fecha_permiso: string;
  hora_salida: string;
  regresa: boolean;
  hora_regreso: string | null;
  tipo_permiso: number;
  origen?: number | null;
  destinos?: number[];
  otro?: string | null;
}

export interface Opcion {
  id: number;
  nombre: string;
}

export interface Persona {
  rfc: string;
  nombre: string;
}

export interface OpcionesReporte {
  general: boolean;
  direcciones: Opcion[];
  departamentos: Opcion[];
  personas: Persona[];
}

export interface FiltroReporte {
  inicio: string;
  fin: string;
  direccion?: string;
  departamento?: string;
  rfc?: string;
  tipo?: string;
  estado?: string;
}

export interface ResultadoReporte {
  resumen: { total: number; pendientes: number; aprobados: number; denegados: number };
  limite: number;
  permisos: Permiso[];
}

export interface Perfil {
  rfc: string;
  nombre: string;
  dependencia: string | null;
  direccion: string | null;
  departamento: string | null;
  email: string;
  celular: string;
  telefono: string;
}

export interface Validador {
  id: number;
  rfc: string;
  nombre: string;
  departamento: string;
}

export interface Jefe {
  rfc: string;
  nombre: string;
  departamento: string;
}

export interface AsignacionRol {
  rfc: string;
  nombre: string;
  rol: string;
  rolNombre: string;
}

/** Quita los filtros vacíos para no mandarlos en la URL. */
function sinVacios(filtro: object): Record<string, string> {
  return Object.fromEntries(Object.entries(filtro).filter(([, valor]) => !!valor));
}

/** El mensaje que el backend mandó, listo para mostrarse. */
export function mensajeDeError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No hay conexión con el servidor. Intenta de nuevo.';
    const mensaje = error.error?.message;
    if (Array.isArray(mensaje)) return mensaje.join('. ');
    if (typeof mensaje === 'string') return mensaje;
  }
  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}

/** Todas las llamadas a la API, en un solo lugar. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl;

  misPermisos(anio?: number): Observable<MisPermisos> {
    return this.http.get<MisPermisos>(`${this.url}/permisos`, {
      params: anio ? { anio } : {},
    });
  }

  permiso(id: number): Observable<PermisoDetalle> {
    return this.http.get<PermisoDetalle>(`${this.url}/permisos/${id}`);
  }

  crearPermiso(datos: NuevoPermiso): Observable<Permiso> {
    return this.http.post<Permiso>(`${this.url}/permisos`, datos);
  }

  cerrarPermiso(id: number): Observable<Permiso> {
    return this.http.post<Permiso>(`${this.url}/permisos/${id}/cerrar`, {});
  }

  pdfPermiso(id: number): Observable<Blob> {
    return this.http.get(`${this.url}/permisos/${id}/pdf`, { responseType: 'blob' });
  }

  ubicaciones(): Observable<{ origenes: Opcion[]; destinos: Opcion[] }> {
    return this.http.get<{ origenes: Opcion[]; destinos: Opcion[] }>(
      `${this.url}/catalogos/ubicaciones`,
    );
  }

  pendientes(): Observable<Permiso[]> {
    return this.http.get<Permiso[]>(`${this.url}/validacion/pendientes`);
  }

  decidir(id: number, aprobar: boolean): Observable<Permiso> {
    return this.http.post<Permiso>(`${this.url}/validacion/${id}/decision`, { aprobar });
  }

  aprobarVarias(
    ids: number[],
  ): Observable<{ aprobadas: number[]; fallidas: { id: number; mensaje: string }[] }> {
    return this.http.post<{ aprobadas: number[]; fallidas: { id: number; mensaje: string }[] }>(
      `${this.url}/validacion/aprobar-varias`,
      { ids },
    );
  }

  opcionesReporte(): Observable<OpcionesReporte> {
    return this.http.get<OpcionesReporte>(`${this.url}/reportes/opciones`);
  }

  reporte(filtro: FiltroReporte): Observable<ResultadoReporte> {
    return this.http.get<ResultadoReporte>(`${this.url}/reportes`, { params: sinVacios(filtro) });
  }

  archivoReporte(formato: 'excel' | 'pdf', filtro: FiltroReporte): Observable<Blob> {
    return this.http.get(`${this.url}/reportes/${formato}`, {
      params: sinVacios(filtro),
      responseType: 'blob',
    });
  }

  perfil(): Observable<Perfil> {
    return this.http.get<Perfil>(`${this.url}/perfil`);
  }

  guardarDatos(datos: { email: string; celular: string; telefono: string }): Observable<void> {
    return this.http.put<void>(`${this.url}/perfil/datos`, datos);
  }

  cambiarContrasena(actual: string, nueva: string): Observable<void> {
    return this.http.put<void>(`${this.url}/perfil/contrasena`, { actual, nueva });
  }

  validadores(): Observable<{ validadores: Validador[]; jefes: Jefe[] }> {
    return this.http.get<{ validadores: Validador[]; jefes: Jefe[] }>(`${this.url}/especiales`);
  }

  opcionesValidador(): Observable<{ personas: Persona[]; departamentos: Opcion[] }> {
    return this.http.get<{ personas: Persona[]; departamentos: Opcion[] }>(
      `${this.url}/especiales/opciones`,
    );
  }

  crearValidador(rfc: string, idDepartamento: number): Observable<void> {
    return this.http.post<void>(`${this.url}/especiales`, { rfc, idDepartamento });
  }

  quitarValidador(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/especiales/${id}`);
  }

  roles(): Observable<{
    catalogo: { clave: string; nombre: string }[];
    asignaciones: AsignacionRol[];
  }> {
    return this.http.get<{
      catalogo: { clave: string; nombre: string }[];
      asignaciones: AsignacionRol[];
    }>(`${this.url}/roles`);
  }

  asignarRol(rfc: string, rol: string): Observable<void> {
    return this.http.put<void>(`${this.url}/roles`, { rfc, rol });
  }

  quitarRol(rfc: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/roles/${rfc}`);
  }
}
