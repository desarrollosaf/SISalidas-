import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AlcanceService } from '../common/alcance.service';
import { Usuario, type UsuarioActual } from '../common/usuario-actual';
import { CrearPermisoDto } from './dto/crear-permiso.dto';
import { PermisoPdfService } from './permiso-pdf.service';
import { PermisosService } from './permisos.service';

@Controller('permisos')
@UseGuards(JwtAuthGuard)
export class PermisosController {
  constructor(
    private readonly permisos: PermisosService,
    private readonly pdf: PermisoPdfService,
    private readonly alcance: AlcanceService,
  ) {}

  @Get()
  mios(@Usuario() usuario: UsuarioActual, @Query('anio') anio?: string) {
    const elegido = Number(anio);
    return this.permisos.mios(usuario.rfc, Number.isInteger(elegido) && elegido ? elegido : undefined);
  }

  @Post()
  crear(@Body() dto: CrearPermisoDto, @Usuario() usuario: UsuarioActual) {
    return this.permisos.crear(dto, usuario);
  }

  @Get(':id')
  ver(@Param('id', ParseIntPipe) id: number, @Usuario() usuario: UsuarioActual) {
    return this.permisos.ver(id, usuario);
  }

  @Post(':id/cerrar')
  cerrar(@Param('id', ParseIntPipe) id: number, @Usuario() usuario: UsuarioActual) {
    return this.permisos.cerrarPropio(id, usuario);
  }

  @Get(':id/pdf')
  @Header('Content-Type', 'application/pdf')
  async descargarPdf(
    @Param('id', ParseIntPipe) id: number,
    @Usuario() usuario: UsuarioActual,
    @Res() res: Response,
  ) {
    const registro = await this.permisos.buscar(id);
    await this.alcance.exigirVer(registro, usuario);
    res.send(await this.pdf.generar(registro));
  }
}
