import { Controller, Get, Injectable, Module, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompartidoModule } from '../common/compartido.module';
import { ORIGENES_PERMITIDOS } from '../common/reglas';
import { limpiar } from '../common/vista-permiso.service';
import { Ubicacion } from '../database/models/externos.models';

@Injectable()
export class CatalogosService {
  constructor(@InjectModel(Ubicacion, 'directorio') private readonly ubicaciones: typeof Ubicacion) {}

  async ubicacionesParaPermiso() {
    const filas = await this.ubicaciones.findAll({
      where: { deleted_at: null },
      order: [['nombre', 'ASC']],
    });
    const lista = filas.map((f) => ({ id: Number(f.id), nombre: limpiar(f.nombre) }));
    return {
      origenes: lista.filter((u) => ORIGENES_PERMITIDOS.includes(u.id)),
      destinos: lista,
    };
  }
}

@Controller('catalogos')
@UseGuards(JwtAuthGuard)
export class CatalogosController {
  constructor(private readonly catalogos: CatalogosService) {}

  @Get('ubicaciones')
  ubicaciones() {
    return this.catalogos.ubicacionesParaPermiso();
  }
}

@Module({
  imports: [CompartidoModule],
  controllers: [CatalogosController],
  providers: [CatalogosService],
})
export class CatalogosModule {}
