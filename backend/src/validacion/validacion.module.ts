import {
  Body,
  ConflictException,
  HttpException,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsBoolean, IsInt } from 'class-validator';
import { Op } from 'sequelize';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AlcanceService } from '../common/alcance.service';
import { CompartidoModule } from '../common/compartido.module';
import { CorreoService } from '../common/correo.service';
import { PadronService } from '../common/padron.service';
import { Usuario, type UsuarioActual } from '../common/usuario-actual';
import { VistaPermisoService } from '../common/vista-permiso.service';
import { ChecadaRegistrada, Registro } from '../database/models/principal.models';
import { PermisosModule } from '../permisos/permisos.module';
import { PermisosService } from '../permisos/permisos.service';

class DecisionDto {
  @IsBoolean()
  aprobar: boolean;
}

class AprobarVariosDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsInt({ each: true })
  ids: number[];
}

@Injectable()
export class ValidacionService {
  constructor(
    @InjectModel(Registro) private readonly registros: typeof Registro,
    @InjectModel(ChecadaRegistrada) private readonly checadas: typeof ChecadaRegistrada,
    private readonly alcance: AlcanceService,
    private readonly padron: PadronService,
    private readonly vistas: VistaPermisoService,
    private readonly correo: CorreoService,
    private readonly permisos: PermisosService,
  ) {}

  /**
   * Solicitudes por resolver de los departamentos a su cargo. Solo las activas: la base trae unas
   * 30 mil pendientes de días pasados que ya se cerraron solas y Laravel seguía mostrando.
   */
  async pendientes(usuario: UsuarioActual) {
    const departamentos = await this.alcance.departamentosQueValida(usuario.rfc);
    const rfcs = await this.padron.rfcsDe(departamentos);
    if (!rfcs.length) return [];
    const filas = await this.registros.findAll({
      where: { aprobacion: 0, status: 1, rfc_usuario: { [Op.in]: rfcs } },
      order: [
        ['fecha_permiso', 'ASC'],
        ['hora_salida', 'ASC'],
      ],
    });
    return this.vistas.vistas(filas);
  }

  async decidir(id: number, aprobar: boolean, usuario: UsuarioActual) {
    const registro = await this.permisos.buscar(id);
    await this.alcance.exigirValidar(registro, usuario);
    if (registro.aprobacion !== 0 || !registro.status) {
      throw new ConflictException('Este permiso ya no está pendiente');
    }

    await registro.update({
      aprobacion: aprobar ? 1 : 2,
      hora_aprobacion: new Date(),
      ...(aprobar ? {} : { status: 0 }),
    });
    if (!aprobar) {
      await this.checadas.update(
        { status: 0 },
        { where: { rfc_usuario: registro.rfc_usuario, status: 1 } },
      );
    }

    const vista = await this.vistas.vista(registro);
    await this.avisar(registro, vista.dependencia, aprobar);
    return vista;
  }

  /**
   * Aprueba varias solicitudes a la vez. Cada una se valida y se procesa por separado, igual que una
   * decisión individual (alcance, estado y correo): si una falla, las demás siguen.
   */
  async aprobarVarias(ids: number[], usuario: UsuarioActual) {
    const aprobadas: number[] = [];
    const fallidas: { id: number; mensaje: string }[] = [];
    for (const id of new Set(ids)) {
      try {
        await this.decidir(id, true, usuario);
        aprobadas.push(id);
      } catch (error) {
        const mensaje =
          error instanceof HttpException ? error.message : 'No se pudo aprobar esta solicitud';
        fallidas.push({ id, mensaje });
      }
    }
    return { aprobadas, fallidas };
  }

  private async avisar(registro: Registro, dependencia: string | null, aprobar: boolean) {
    const personas = await this.padron.personasPorRfc([registro.rfc_usuario]);
    const persona = personas.get(registro.rfc_usuario);
    const correo = persona && (await this.padron.correoDe(persona));
    if (!persona || !correo) return;
    await this.correo.solicitudResuelta(correo, {
      servidor: persona.Nombre.trim(),
      dependencia: dependencia ?? '',
      fecha: registro.fecha_permiso,
      horaSalida: registro.hora_salida.slice(0, 5),
      horaRegreso: registro.hora_regreso?.slice(0, 5) ?? null,
      estado: aprobar ? 'Procedente' : 'Improcedente',
    });
  }
}

@Controller('validacion')
@UseGuards(JwtAuthGuard)
export class ValidacionController {
  constructor(private readonly validacion: ValidacionService) {}

  @Get('pendientes')
  pendientes(@Usuario() usuario: UsuarioActual) {
    return this.validacion.pendientes(usuario);
  }

  @Post('aprobar-varias')
  aprobarVarias(@Body() dto: AprobarVariosDto, @Usuario() usuario: UsuarioActual) {
    return this.validacion.aprobarVarias(dto.ids, usuario);
  }

  @Post(':id/decision')
  decidir(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DecisionDto,
    @Usuario() usuario: UsuarioActual,
  ) {
    return this.validacion.decidir(id, dto.aprobar, usuario);
  }
}

@Module({
  imports: [CompartidoModule, PermisosModule],
  controllers: [ValidacionController],
  providers: [ValidacionService],
})
export class ValidacionModule {}
