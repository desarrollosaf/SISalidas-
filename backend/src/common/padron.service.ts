import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, WhereOptions } from 'sequelize';
import {
  DatosGenerales,
  SUsers,
  SUsuario,
  TDepartamento,
  TDependencia,
  TDireccion,
} from '../database/models/padron.models';
import { esJefe } from './reglas';

export interface Perfil {
  rfc: string;
  nombre: string;
  idDependencia: number | null;
  idDireccion: number | null;
  idDepartamento: number | null;
  rango: number | null;
  estado: number;
}

export interface Persona {
  rfc: string;
  nombre: string;
}

export interface Unidad {
  id: number;
  nombre: string;
}

const nombreDe = (u: { nombre_completo: string | null; Nombre: string | null }) =>
  (u.nombre_completo ?? u.Nombre ?? '').trim();

/** Consultas al padrón centralizado. */
@Injectable()
export class PadronService {
  constructor(
    @InjectModel(SUsuario, 'external') private readonly usuarios: typeof SUsuario,
    @InjectModel(SUsers, 'external') private readonly cuentas: typeof SUsers,
    @InjectModel(TDepartamento, 'external') private readonly departamentos: typeof TDepartamento,
    @InjectModel(TDireccion, 'external') private readonly direcciones: typeof TDireccion,
    @InjectModel(TDependencia, 'external') private readonly dependencias: typeof TDependencia,
    @InjectModel(DatosGenerales, 'external') private readonly datos: typeof DatosGenerales,
  ) {}

  async perfil(rfc: string): Promise<Perfil | null> {
    const persona = await this.usuarios.findOne({ where: { N_Usuario: rfc } });
    if (!persona) return null;
    const cuenta = await this.cuentas.findOne({ where: { username: rfc } });
    return {
      rfc,
      nombre: persona.Nombre.trim(),
      idDependencia: persona.id_Dependencia,
      idDireccion: persona.id_Direccion,
      idDepartamento: persona.id_Departamento,
      rango: cuenta?.rango ?? null,
      estado: persona.Estado,
    };
  }

  /**
   * A quién le toca autorizar a esta persona: el jefe de su departamento y, si no hay, el del
   * departamento titular de su área (misma clave presupuestal en sus dos primeros dígitos,
   * terminada en 001). Si hay varios, el de mayor jerarquía.
   */
  async jefeDe(rfc: string): Promise<SUsuario | null> {
    const persona = await this.usuarios.findOne({ where: { N_Usuario: rfc } });
    if (!persona?.id_Departamento) return null;

    const propio = await this.jefeDelDepartamento(persona.id_Departamento);
    if (propio) return propio;

    const departamento = await this.departamentos.findByPk(persona.id_Departamento);
    if (!departamento?.c_presup) return null;
    const area = String(departamento.c_presup).slice(0, 2);
    const titular = await this.departamentos.findOne({ where: { c_presup: Number(`${area}001`) } });
    return titular ? this.jefeDelDepartamento(titular.id_Departamento) : null;
  }

  private async jefeDelDepartamento(idDepartamento: number): Promise<SUsuario | null> {
    const candidatos = await this.usuarios.findAll({
      where: { id_Departamento: idDepartamento, Estado: 1 },
    });
    const rangos = await this.rangosPorRfc(candidatos.map((c) => c.N_Usuario));
    const jefes = candidatos
      .filter((c) => esJefe(c.id_Dependencia, rangos.get(c.N_Usuario) ?? null))
      .sort((a, b) => rangos.get(a.N_Usuario)! - rangos.get(b.N_Usuario)!);
    return jefes[0] ?? null;
  }

  async rangosPorRfc(rfcs: string[]): Promise<Map<string, number | null>> {
    if (!rfcs.length) return new Map();
    const filas = await this.cuentas.findAll({ where: { username: { [Op.in]: rfcs } } });
    return new Map(filas.map((f) => [f.username, f.rango]));
  }

  /** Correo de avisos: el que la persona capturó en sus datos o, si no, el del padrón. */
  async correoDe(persona: { N_Usuario: string; C_Electronico: string | null }): Promise<string | null> {
    const datos = await this.datos.findOne({ where: { rfc_usuario: persona.N_Usuario } });
    return datos?.email?.trim() || persona.C_Electronico?.trim() || null;
  }

  /** RFC de las personas que pertenecen a esos departamentos o direcciones. */
  async rfcsDe(departamentos: number[], direcciones: number[] = []): Promise<string[]> {
    const condiciones: WhereOptions[] = [];
    if (departamentos.length) condiciones.push({ id_Departamento: { [Op.in]: departamentos } });
    if (direcciones.length) condiciones.push({ id_Direccion: { [Op.in]: direcciones } });
    if (!condiciones.length) return [];
    const filas = await this.usuarios.findAll({
      attributes: ['N_Usuario'],
      where: { [Op.or]: condiciones },
    });
    return filas.map((f) => f.N_Usuario).filter(Boolean);
  }

  /** Personas activas de esos departamentos o direcciones, o de toda una dependencia. */
  async personas(filtro: {
    departamentos?: number[];
    direcciones?: number[];
    dependencia?: number;
  }): Promise<Persona[]> {
    const condiciones: WhereOptions[] = [];
    if (filtro.departamentos?.length) {
      condiciones.push({ id_Departamento: { [Op.in]: filtro.departamentos } });
    }
    if (filtro.direcciones?.length) {
      condiciones.push({ id_Direccion: { [Op.in]: filtro.direcciones } });
    }
    if (filtro.dependencia) condiciones.push({ id_Dependencia: filtro.dependencia });
    if (!condiciones.length) return [];
    const filas = await this.usuarios.findAll({
      attributes: ['N_Usuario', 'Nombre'],
      where: { Estado: 1, [Op.or]: condiciones },
      order: [['Nombre', 'ASC']],
    });
    return filas.map((f) => ({ rfc: f.N_Usuario, nombre: f.Nombre.trim() }));
  }

  async personasPorRfc(rfcs: string[]): Promise<Map<string, SUsuario>> {
    const unicos = [...new Set(rfcs.filter(Boolean))];
    if (!unicos.length) return new Map();
    const filas = await this.usuarios.findAll({ where: { N_Usuario: { [Op.in]: unicos } } });
    return new Map(filas.map((f) => [f.N_Usuario, f]));
  }

  async nombresDepartamentos(ids: number[]): Promise<Map<number, string>> {
    const unicos = [...new Set(ids.filter((id) => id != null))];
    if (!unicos.length) return new Map();
    const filas = await this.departamentos.findAll({
      where: { id_Departamento: { [Op.in]: unicos } },
    });
    return new Map(filas.map((f) => [f.id_Departamento, nombreDe(f)]));
  }

  async nombresDirecciones(ids: number[]): Promise<Map<number, string>> {
    const unicos = [...new Set(ids.filter((id) => id != null))];
    if (!unicos.length) return new Map();
    const filas = await this.direcciones.findAll({
      where: { id_Direccion: { [Op.in]: unicos } },
    });
    return new Map(filas.map((f) => [f.id_Direccion, nombreDe(f)]));
  }

  async nombresDependencias(ids: number[]): Promise<Map<number, string>> {
    const unicos = [...new Set(ids.filter((id) => id != null))];
    if (!unicos.length) return new Map();
    const filas = await this.dependencias.findAll({
      where: { id_Dependencia: { [Op.in]: unicos } },
    });
    return new Map(filas.map((f) => [f.id_Dependencia, nombreDe(f)]));
  }

  /** Departamentos de una dependencia o de ciertas direcciones/departamentos, ordenados. */
  async listaDepartamentos(filtro: {
    dependencia?: number;
    direcciones?: number[];
    ids?: number[];
  }): Promise<Unidad[]> {
    const condiciones: WhereOptions[] = [];
    if (filtro.dependencia) condiciones.push({ id_Dependencia: filtro.dependencia });
    if (filtro.direcciones?.length) {
      condiciones.push({ id_Direccion: { [Op.in]: filtro.direcciones } });
    }
    if (filtro.ids?.length) condiciones.push({ id_Departamento: { [Op.in]: filtro.ids } });
    if (!condiciones.length) return [];
    const filas = await this.departamentos.findAll({ where: { [Op.or]: condiciones } });
    return filas
      .map((f) => ({ id: f.id_Departamento, nombre: nombreDe(f) }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  /** Direcciones activas de una dependencia, para el reporte general. */
  async listaDirecciones(dependencia: number): Promise<Unidad[]> {
    const filas = await this.direcciones.findAll({
      where: { id_Dependencia: dependencia, Estado: 1 },
    });
    return filas
      .map((f) => ({ id: f.id_Direccion, nombre: nombreDe(f) }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  departamento(id: number): Promise<TDepartamento | null> {
    return this.departamentos.findByPk(id);
  }
}
