import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { PadronService } from '../common/padron.service';
import { ROL_USUARIO } from '../common/usuario-actual';
import { Rol } from '../database/models/rol.model';
import { UsuarioRol } from '../database/models/usuario-rol.model';

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Rol) private readonly roles: typeof Rol,
    @InjectModel(UsuarioRol) private readonly asignaciones: typeof UsuarioRol,
    private readonly padron: PadronService,
  ) {}

  async rolDe(rfc: string): Promise<string> {
    const asignacion = await this.asignaciones.findOne({ where: { rfc }, include: [Rol] });
    return asignacion?.rol?.clave ?? ROL_USUARIO;
  }

  catalogo() {
    return this.roles.findAll({ attributes: ['clave', 'nombre'], order: [['id', 'ASC']] });
  }

  async listar() {
    const filas = await this.asignaciones.findAll({ include: [Rol], order: [['rfc', 'ASC']] });
    const personas = await this.padron.personasPorRfc(filas.map((f) => f.rfc));
    return filas.map((f) => ({
      rfc: f.rfc,
      nombre: personas.get(f.rfc)?.Nombre.trim() ?? 'Sin registro en el padrón',
      rol: f.rol.clave,
      rolNombre: f.rol.nombre,
    }));
  }

  async asignar(rfc: string, clave: string): Promise<void> {
    const rol = await this.roles.findOne({ where: { clave } });
    if (!rol) throw new NotFoundException('El rol no existe');
    const existente = await this.asignaciones.findOne({ where: { rfc } });
    if (existente) {
      await existente.update({ rolId: rol.id });
    } else {
      await this.asignaciones.create({ rfc, rolId: rol.id });
    }
  }

  async quitar(rfc: string): Promise<void> {
    await this.asignaciones.destroy({ where: { rfc } });
  }
}
