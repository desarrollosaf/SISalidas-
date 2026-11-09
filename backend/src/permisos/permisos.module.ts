import { Module } from '@nestjs/common';
import { CompartidoModule } from '../common/compartido.module';
import { PermisoPdfService } from './permiso-pdf.service';
import { PermisosController } from './permisos.controller';
import { PermisosService } from './permisos.service';

@Module({
  imports: [CompartidoModule],
  controllers: [PermisosController],
  providers: [PermisosService, PermisoPdfService],
  exports: [PermisosService],
})
export class PermisosModule {}
