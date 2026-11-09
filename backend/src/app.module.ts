import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SequelizeModule, SequelizeModuleOptions } from '@nestjs/sequelize';
import authConfig from './config/auth.config';
import databaseConfig from './config/database.config';
import operacionConfig from './config/operacion.config';
import {
  MODELOS_CHECADORES,
  MODELOS_DIRECTORIO,
  MODELOS_PADRON,
  MODELOS_PRINCIPAL,
} from './database/salidas-db.module';
import { AuthModule } from './auth/auth.module';
import { CatalogosModule } from './catalogos/catalogos.module';
import { ChecadasModule } from './checadas/checadas.module';
import { EspecialesModule } from './especiales/especiales.module';
import { PerfilModule } from './perfil/perfil.module';
import { PermisosModule } from './permisos/permisos.module';
import { ReportesModule } from './reportes/reportes.module';
import { RolesModule } from './roles/roles.module';
import { ValidacionModule } from './validacion/validacion.module';

interface ConexionMysql {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

/**
 * Una conexión a MySQL. Las bases guardan la hora "de pared" de México (Laravel corre con
 * America/Mexico_City), que es UTC-6 fijo desde 2022: así los DATETIME se leen y escriben igual.
 */
const conexion = (clave: string, models: SequelizeModuleOptions['models'], name?: string) =>
  SequelizeModule.forRootAsync({
    name,
    inject: [ConfigService],
    useFactory: (config: ConfigService): SequelizeModuleOptions => ({
      name,
      dialect: 'mysql',
      ...config.get<ConexionMysql>(`database.${clave}`)!,
      models,
      autoLoadModels: true,
      synchronize: false,
      logging: false,
      timezone: '-06:00',
    }),
  });

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, authConfig, operacionConfig],
    }),
    ScheduleModule.forRoot(),
    conexion('main', MODELOS_PRINCIPAL),
    conexion('external', MODELOS_PADRON, 'external'),
    conexion('directorio', MODELOS_DIRECTORIO, 'directorio'),
    conexion('checadores', MODELOS_CHECADORES, 'checadores'),
    AuthModule,
    RolesModule,
    CatalogosModule,
    PermisosModule,
    ValidacionModule,
    ReportesModule,
    EspecialesModule,
    PerfilModule,
    ChecadasModule,
  ],
})
export class AppModule {}
