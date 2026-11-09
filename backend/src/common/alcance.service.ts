import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Especial, Registro } from '../database/models/principal.models';
import { PadronService } from './padron.service';
import { esJefe } from './reglas';
import { ROL_ADMINISTRADOR, ROL_REPORTE_GENERAL, UsuarioActual } from './usuario-actual';

/** Departamentos y direcciones cuyos permisos puede consultar una persona. */
export interface AlcanceReportes {
  todo: boolean;
  departamentos: number[];
  direcciones: number[];
}

export interface Capacidades {
  validar: boolean;
  reportes: boolean;
  reporteGeneral: boolean;
  administrar: boolean;
}

/**
 * Quién puede ver y decidir qué. En Laravel estas revisiones vivían en el menú, así que cualquier
 * usuario con sesión podía abrir o cerrar un permiso ajeno cambiando el id de la URL. Aquí todo
 * pasa por este servicio antes de tocar un registro.
 */
@Injectable()
export class AlcanceService {
  constructor(
    @InjectModel(Especial) private readonly especiales: typeof Especial,
    private readonly padron: PadronService,
  ) {}

  private especialesDe(rfc: string): Promise<Especial[]> {
    return this.especiales.findAll({ where: { rfc_usuario: rfc, status: 1 } });
  }

  /**
   * Departamentos cuyos permisos puede autorizar: los delegados como validador especial o, si no
   * tiene ninguno, el suyo cuando es jefe.
   */
  async departamentosQueValida(rfc: string): Promise<number[]> {
    const especiales = await this.especialesDe(rfc);
    if (especiales.length) {
      return especiales.map((e) => Number(e.id_Departamento)).filter(Boolean);
    }
    const perfil = await this.padron.perfil(rfc);
    if (perfil?.idDepartamento && esJefe(perfil.idDependencia, perfil.rango)) {
      return [perfil.idDepartamento];
    }
    return [];
  }

  /**
   * Qué puede consultar en reportes. El rango 4 ve su departamento; los rangos 1 a 3, su dirección.
   * Con validador especial, lo mismo pero sobre lo delegado.
   */
  async alcanceReportes(usuario: UsuarioActual): Promise<AlcanceReportes> {
    if (usuario.rol === ROL_ADMINISTRADOR || usuario.rol === ROL_REPORTE_GENERAL) {
      return { todo: true, departamentos: [], direcciones: [] };
    }

    const departamentos: number[] = [];
    const direcciones: number[] = [];
    const especiales = await this.especialesDe(usuario.rfc);

    if (especiales.length) {
      for (const especial of especiales) {
        const idDepartamento = Number(especial.id_Departamento);
        if (Number(especial.rango) === 4 || !especial.id_Direccion) {
          // Laravel dejaba vacío id_Direccion en casi todos: se limita al departamento delegado.
          if (idDepartamento) departamentos.push(idDepartamento);
        } else {
          direcciones.push(Number(especial.id_Direccion));
        }
      }
    } else {
      const perfil = await this.padron.perfil(usuario.rfc);
      if (perfil && esJefe(perfil.idDependencia, perfil.rango)) {
        if (perfil.rango === 4 && perfil.idDepartamento) {
          departamentos.push(perfil.idDepartamento);
        } else if (perfil.idDireccion) {
          direcciones.push(perfil.idDireccion);
        }
      }
    }
    return { todo: false, departamentos, direcciones };
  }

  async capacidades(usuario: UsuarioActual): Promise<Capacidades> {
    const alcance = await this.alcanceReportes(usuario);
    const valida = await this.departamentosQueValida(usuario.rfc);
    return {
      validar: valida.length > 0,
      reportes: alcance.todo || alcance.departamentos.length > 0 || alcance.direcciones.length > 0,
      reporteGeneral: alcance.todo,
      administrar: usuario.rol === ROL_ADMINISTRADOR,
    };
  }

  /** Puede autorizar o cerrar como jefe este permiso. */
  async puedeValidar(registro: Registro, usuario: UsuarioActual): Promise<boolean> {
    const departamentos = await this.departamentosQueValida(usuario.rfc);
    if (!departamentos.length) return false;
    const solicitante = await this.padron.perfil(registro.rfc_usuario);
    return !!solicitante?.idDepartamento && departamentos.includes(solicitante.idDepartamento);
  }

  async exigirValidar(registro: Registro, usuario: UsuarioActual): Promise<void> {
    if (!(await this.puedeValidar(registro, usuario))) {
      throw new ForbiddenException('Este permiso no le corresponde a tu área');
    }
  }

  /** Puede ver el permiso: su dueño, quien lo valida y quien lo alcanza en reportes. */
  async exigirVer(registro: Registro, usuario: UsuarioActual): Promise<void> {
    if (registro.rfc_usuario === usuario.rfc) return;
    if (await this.puedeValidar(registro, usuario)) return;

    const alcance = await this.alcanceReportes(usuario);
    if (alcance.todo) return;
    const solicitante = await this.padron.perfil(registro.rfc_usuario);
    if (
      solicitante &&
      ((solicitante.idDepartamento && alcance.departamentos.includes(solicitante.idDepartamento)) ||
        (solicitante.idDireccion && alcance.direcciones.includes(solicitante.idDireccion)))
    ) {
      return;
    }
    throw new ForbiddenException('No tienes acceso a este permiso');
  }
}
