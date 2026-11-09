import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { EmpleadoChecador, TransaccionChecador, Ubicacion } from './models/externos.models';
import {
  DatosGenerales,
  SUsers,
  SUsuario,
  TDepartamento,
  TDependencia,
  TDireccion,
  UsersSafs,
} from './models/padron.models';
import {
  ChecadaRegistrada,
  Destino,
  Especial,
  Folio,
  Registro,
} from './models/principal.models';
import { Rol } from './models/rol.model';
import { UsuarioRol } from './models/usuario-rol.model';

export const MODELOS_PRINCIPAL = [
  Registro,
  Destino,
  Folio,
  Especial,
  ChecadaRegistrada,
  Rol,
  UsuarioRol,
];
export const MODELOS_PADRON = [
  UsersSafs,
  SUsuario,
  SUsers,
  TDependencia,
  TDireccion,
  TDepartamento,
  DatosGenerales,
];
export const MODELOS_DIRECTORIO = [Ubicacion];
export const MODELOS_CHECADORES = [TransaccionChecador, EmpleadoChecador];

/** Deja disponibles los modelos de las cuatro conexiones para los módulos de dominio. */
@Module({
  imports: [
    SequelizeModule.forFeature(MODELOS_PRINCIPAL),
    SequelizeModule.forFeature(MODELOS_PADRON, 'external'),
    SequelizeModule.forFeature(MODELOS_DIRECTORIO, 'directorio'),
    SequelizeModule.forFeature(MODELOS_CHECADORES, 'checadores'),
  ],
  exports: [SequelizeModule],
})
export class SalidasDbModule {}
