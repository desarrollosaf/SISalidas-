import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Ubicacion } from '../database/models/externos.models';
import { ChecadaRegistrada, Destino, Registro } from '../database/models/principal.models';
import { PadronService } from './padron.service';
import { DESTINO_OTRO, minutosEntre, NOMBRE_TIPO, textoFolio, TIPO_LABORAL } from './reglas';

export type EstadoPermiso = 'pendiente' | 'aprobado' | 'denegado';

export interface DestinoVista {
  nombre: string;
  entrada: string | null;
  salida: string | null;
}

/** Un permiso tal como lo consume el frontend, con los nombres ya resueltos. */
export interface PermisoVista {
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

const ESTADOS: Record<number, EstadoPermiso> = { 0: 'pendiente', 1: 'aprobado', 2: 'denegado' };

const FORMATO_MEXICO = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Mexico_City',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** "YYYY-MM-DD HH:mm:ss" en hora de México. */
export function fechaHoraMexico(fecha: Date | null | undefined): string | null {
  return fecha ? FORMATO_MEXICO.format(new Date(fecha)) : null;
}

const horaDe = (fecha: Date | null | undefined) => fechaHoraMexico(fecha)?.slice(11) ?? null;

/** Convierte registros en vistas haciendo una sola consulta por tabla, no una por registro. */
@Injectable()
export class VistaPermisoService {
  constructor(
    private readonly padron: PadronService,
    @InjectModel(Destino) private readonly destinos: typeof Destino,
    @InjectModel(ChecadaRegistrada) private readonly checadas: typeof ChecadaRegistrada,
    @InjectModel(Ubicacion, 'directorio') private readonly ubicaciones: typeof Ubicacion,
  ) {}

  async vista(registro: Registro): Promise<PermisoVista> {
    const [vista] = await this.vistas([registro]);
    return vista;
  }

  async vistas(registros: Registro[]): Promise<PermisoVista[]> {
    if (!registros.length) return [];

    const destinos = await this.destinos.findAll({
      where: { idRegistro: { [Op.in]: registros.map((r) => r.id) } },
      order: [['id', 'ASC']],
    });
    const personas = await this.padron.personasPorRfc(registros.map((r) => r.rfc_usuario));
    const lista = [...personas.values()];
    const [departamentos, direcciones, dependencias] = await Promise.all([
      this.padron.nombresDepartamentos(lista.map((p) => p.id_Departamento!)),
      this.padron.nombresDirecciones(lista.map((p) => p.id_Direccion!)),
      this.padron.nombresDependencias(lista.map((p) => p.id_Dependencia!)),
    ]);

    const idsChecadas = [
      ...registros.flatMap((r) => [r.id_salida, r.id_entrada]),
      ...destinos.flatMap((d) => [d.idEntrada, d.idSalida]),
    ].filter((id): id is number => !!id);
    const checadas = idsChecadas.length
      ? await this.checadas.findAll({ where: { id: { [Op.in]: [...new Set(idsChecadas)] } } })
      : [];
    const horaChecada = new Map(checadas.map((c) => [Number(c.id), c.punch_time]));

    const idsUbicacion = [
      ...registros.map((r) => r.origen),
      ...destinos.map((d) => d.idDestino).filter((id) => id !== DESTINO_OTRO),
    ].filter((id): id is number => !!id);
    const ubicaciones = idsUbicacion.length
      ? await this.ubicaciones.findAll({ where: { id: { [Op.in]: [...new Set(idsUbicacion)] } } })
      : [];
    const nombreUbicacion = new Map(ubicaciones.map((u) => [Number(u.id), limpiar(u.nombre)]));

    const destinosPorRegistro = new Map<number, Destino[]>();
    for (const destino of destinos) {
      const id = Number(destino.idRegistro);
      destinosPorRegistro.set(id, [...(destinosPorRegistro.get(id) ?? []), destino]);
    }

    return registros.map((r) => {
      const persona = personas.get(r.rfc_usuario);
      const salida = r.id_salida ? horaDe(horaChecada.get(Number(r.id_salida))) : null;
      const entrada = r.id_entrada ? horaDe(horaChecada.get(Number(r.id_entrada))) : null;
      const horaSalida = r.hora_salida.slice(0, 5);
      const horaRegreso = r.hora_regreso?.slice(0, 5) ?? null;
      return {
        id: Number(r.id),
        folio: textoFolio(r.rfc_usuario, r.tipo_permiso, r.folio, r.fecha_permiso),
        rfc: r.rfc_usuario,
        nombre: persona?.Nombre.trim() ?? r.rfc_usuario,
        dependencia: dependencias.get(persona?.id_Dependencia as number) ?? null,
        direccion: direcciones.get(persona?.id_Direccion as number) ?? null,
        departamento: departamentos.get(persona?.id_Departamento as number) ?? null,
        tipo: r.tipo_permiso,
        tipoNombre: NOMBRE_TIPO[r.tipo_permiso] ?? 'Sin tipo',
        fecha: r.fecha_permiso,
        horaSalida,
        horaRegreso,
        regresa: !!r.regresa,
        estado: ESTADOS[r.aprobacion] ?? 'pendiente',
        activo: !!r.status,
        resueltoEl: fechaHoraMexico(r.hora_aprobacion),
        solicitadoEl: fechaHoraMexico(r.created_at),
        salidaRegistrada: salida,
        entradaRegistrada: entrada,
        minutosSolicitados: minutosEntre(horaSalida, horaRegreso),
        minutosOcupados: minutosEntre(salida, entrada),
        // Solo el laboral tiene origen. En Laravel el campo estaba oculto pero se enviaba con su
        // primera opción, así que casi todos los personales y de comida traen "MATAMOROS" sin que
        // nadie lo eligiera.
        origen:
          r.tipo_permiso === TIPO_LABORAL && r.origen
            ? (nombreUbicacion.get(Number(r.origen)) ?? null)
            : null,
        destinos: (destinosPorRegistro.get(Number(r.id)) ?? []).map((d) => ({
          nombre:
            d.idDestino === DESTINO_OTRO
              ? (d.otroDestino ?? 'Otro')
              : (nombreUbicacion.get(Number(d.idDestino)) ?? 'Sin dato'),
          entrada: d.idEntrada ? horaDe(horaChecada.get(Number(d.idEntrada))) : null,
          salida: d.idSalida ? horaDe(horaChecada.get(Number(d.idSalida))) : null,
        })),
      };
    });
  }
}

/** El catálogo trae dobles espacios ("OSFEM  - QUINTANA ROO"). */
export const limpiar = (texto: string) => texto.replace(/\s+/g, ' ').trim();
