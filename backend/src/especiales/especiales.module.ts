import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CompartidoModule } from '../common/compartido.module';
import { PadronService } from '../common/padron.service';
import { DEPENDENCIA_OSFEM, esJefe, rangoPorClave } from '../common/reglas';
import { ROL_ADMINISTRADOR } from '../common/usuario-actual';
import { SUsuario } from '../database/models/padron.models';
import { Especial } from '../database/models/principal.models';

class CrearEspecialDto {
  @IsString()
  @IsNotEmpty()
  rfc: string;

  @IsInt()
  idDepartamento: number;
}

/** Validadores especiales: quien autoriza un departamento que no es el suyo. */
@Injectable()
export class EspecialesService {
  constructor(
    @InjectModel(Especial) private readonly especiales: typeof Especial,
    @InjectModel(SUsuario, 'external') private readonly usuarios: typeof SUsuario,
    private readonly padron: PadronService,
  ) {}

  async listar() {
    const filas = await this.especiales.findAll({ where: { status: 1 } });
    const personas = await this.padron.personasPorRfc(filas.map((f) => f.rfc_usuario));
    const departamentos = await this.padron.nombresDepartamentos(
      filas.map((f) => Number(f.id_Departamento)),
    );
    return {
      validadores: filas.map((f) => ({
        id: Number(f.id),
        rfc: f.rfc_usuario,
        nombre: personas.get(f.rfc_usuario)?.Nombre.trim() ?? f.rfc_usuario,
        departamento: departamentos.get(Number(f.id_Departamento)) ?? 'Sin departamento',
      })),
      jefes: await this.jefes(),
    };
  }

  /** Los jefes de OSFEM, para ver de un vistazo quién autoriza cada departamento. */
  private async jefes() {
    const activos = await this.usuarios.findAll({
      where: { id_Dependencia: DEPENDENCIA_OSFEM, Estado: 1 },
    });
    const rangos = await this.padron.rangosPorRfc(activos.map((a) => a.N_Usuario));
    const jefes = activos.filter((a) =>
      esJefe(a.id_Dependencia, rangos.get(a.N_Usuario) ?? null),
    );
    const departamentos = await this.padron.nombresDepartamentos(
      jefes.map((j) => j.id_Departamento!),
    );
    return jefes
      .map((j) => ({
        rfc: j.N_Usuario,
        nombre: j.Nombre.trim(),
        departamento: departamentos.get(j.id_Departamento!) ?? 'Sin departamento',
      }))
      .sort((a, b) => a.departamento.localeCompare(b.departamento, 'es'));
  }

  async opciones() {
    const [personas, departamentos] = await Promise.all([
      this.padron.personas({ dependencia: DEPENDENCIA_OSFEM }),
      this.padron.listaDepartamentos({ dependencia: DEPENDENCIA_OSFEM }),
    ]);
    return { personas, departamentos };
  }

  async crear(rfc: string, idDepartamento: number) {
    const departamento = await this.padron.departamento(idDepartamento);
    if (!departamento) throw new NotFoundException('El departamento no existe');
    const repetido = await this.especiales.findOne({
      where: { rfc_usuario: rfc, id_Departamento: String(idDepartamento), status: 1 },
    });
    if (repetido) throw new ConflictException('Esa persona ya valida ese departamento');
    await this.especiales.create({
      rfc_usuario: rfc,
      id_Departamento: String(idDepartamento),
      // Laravel dejaba vacía la dirección, y sin ella los reportes de esta persona salían vacíos.
      id_Direccion: departamento.id_Direccion ? String(departamento.id_Direccion) : null,
      rango: String(rangoPorClave(departamento.c_presup ?? '')),
    });
  }

  async quitar(id: number) {
    const especial = await this.especiales.findByPk(id);
    if (!especial) throw new NotFoundException('El validador no existe');
    await especial.update({ status: 0 });
  }
}

@Controller('especiales')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROL_ADMINISTRADOR)
export class EspecialesController {
  constructor(private readonly especiales: EspecialesService) {}

  @Get()
  listar() {
    return this.especiales.listar();
  }

  @Get('opciones')
  opciones() {
    return this.especiales.opciones();
  }

  @Post()
  crear(@Body() dto: CrearEspecialDto) {
    return this.especiales.crear(dto.rfc, dto.idDepartamento);
  }

  @Delete(':id')
  quitar(@Param('id', ParseIntPipe) id: number) {
    return this.especiales.quitar(id);
  }
}

@Module({
  imports: [CompartidoModule],
  controllers: [EspecialesController],
  providers: [EspecialesService],
})
export class EspecialesModule {}
