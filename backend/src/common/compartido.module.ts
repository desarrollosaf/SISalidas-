import { Module } from '@nestjs/common';
import { JwtAuthModule } from '../auth/jwt-auth.module';
import { SalidasDbModule } from '../database/salidas-db.module';
import { AlcanceService } from './alcance.service';
import { CorreoService } from './correo.service';
import { PadronService } from './padron.service';
import { VistaPermisoService } from './vista-permiso.service';

const SERVICIOS = [PadronService, AlcanceService, CorreoService, VistaPermisoService];

/** Servicios que usan todos los módulos de dominio. */
@Module({
  imports: [SalidasDbModule, JwtAuthModule],
  providers: SERVICIOS,
  exports: [SalidasDbModule, JwtAuthModule, ...SERVICIOS],
})
export class CompartidoModule {}
