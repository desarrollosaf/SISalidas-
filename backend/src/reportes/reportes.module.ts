import { Controller, Get, Module, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompartidoModule } from '../common/compartido.module';
import { Usuario, type UsuarioActual } from '../common/usuario-actual';
import { type FiltroReporte, ReportesService } from './reportes.service';

@Controller('reportes')
@UseGuards(JwtAuthGuard)
export class ReportesController {
  constructor(private readonly reportes: ReportesService) {}

  @Get('opciones')
  opciones(@Usuario() usuario: UsuarioActual) {
    return this.reportes.opciones(usuario);
  }

  @Get()
  consultar(@Usuario() usuario: UsuarioActual, @Query() filtro: FiltroReporte) {
    return this.reportes.consultar(usuario, filtro);
  }

  @Get('excel')
  async excel(
    @Usuario() usuario: UsuarioActual,
    @Query() filtro: FiltroReporte,
    @Res() res: Response,
  ) {
    const archivo = await this.reportes.excel(usuario, filtro);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.send(archivo);
  }

  @Get('pdf')
  async pdf(
    @Usuario() usuario: UsuarioActual,
    @Query() filtro: FiltroReporte,
    @Res() res: Response,
  ) {
    const archivo = await this.reportes.pdf(usuario, filtro);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(archivo);
  }
}

@Module({
  imports: [CompartidoModule],
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}
