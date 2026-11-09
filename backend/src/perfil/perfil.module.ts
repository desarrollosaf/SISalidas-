import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Put,
  UseGuards,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as bcrypt from 'bcryptjs';
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompartidoModule } from '../common/compartido.module';
import { PadronService } from '../common/padron.service';
import { Usuario, type UsuarioActual } from '../common/usuario-actual';
import { DatosGenerales, UsersSafs } from '../database/models/padron.models';

const DIEZ_DIGITOS = /^\d{10}$/;

class DatosDto {
  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(50, { message: 'El correo debe tener máximo 50 caracteres' })
  email: string;

  @Matches(DIEZ_DIGITOS, { message: 'El celular debe tener 10 dígitos' })
  celular: string;

  @Matches(DIEZ_DIGITOS, { message: 'El teléfono debe tener 10 dígitos' })
  telefono: string;
}

class ContrasenaDto {
  @IsString()
  @IsNotEmpty()
  actual: string;

  @IsString()
  @IsNotEmpty()
  nueva: string;
}

/** Misma política que Laravel: 8 caracteres con mayúscula, minúscula, número y símbolo. */
export function contrasenaSegura(texto: string): boolean {
  return (
    texto.length >= 8 &&
    /[A-Z]/.test(texto) &&
    /[a-z]/.test(texto) &&
    /[0-9]/.test(texto) &&
    /[^\w]/.test(texto)
  );
}

@Injectable()
export class PerfilService {
  constructor(
    @InjectModel(DatosGenerales, 'external') private readonly datos: typeof DatosGenerales,
    @InjectModel(UsersSafs, 'external') private readonly cuentas: typeof UsersSafs,
    private readonly padron: PadronService,
  ) {}

  async ver(rfc: string) {
    const perfil = await this.padron.perfil(rfc);
    const contacto = await this.datos.findOne({ where: { rfc_usuario: rfc } });
    const [direcciones, departamentos, dependencias] = await Promise.all([
      this.padron.nombresDirecciones(perfil?.idDireccion ? [perfil.idDireccion] : []),
      this.padron.nombresDepartamentos(perfil?.idDepartamento ? [perfil.idDepartamento] : []),
      this.padron.nombresDependencias(perfil?.idDependencia ? [perfil.idDependencia] : []),
    ]);
    return {
      rfc,
      nombre: perfil?.nombre ?? rfc,
      dependencia: dependencias.get(perfil?.idDependencia as number) ?? null,
      direccion: direcciones.get(perfil?.idDireccion as number) ?? null,
      departamento: departamentos.get(perfil?.idDepartamento as number) ?? null,
      email: contacto?.email ?? '',
      celular: contacto?.celular ?? '',
      telefono: contacto?.telefono ?? '',
    };
  }

  async guardarDatos(rfc: string, dto: DatosDto) {
    const existente = await this.datos.findOne({ where: { rfc_usuario: rfc } });
    if (existente) {
      await existente.update({ ...dto });
    } else {
      await this.datos.create({ ...dto, rfc_usuario: rfc });
    }
  }

  async cambiarContrasena(usuario: UsuarioActual, dto: ContrasenaDto) {
    const cuenta = await this.cuentas.findByPk(usuario.sub);
    if (!cuenta || !(await bcrypt.compare(dto.actual, cuenta.password))) {
      throw new BadRequestException(['Tu contraseña actual no es correcta']);
    }
    if (!contrasenaSegura(dto.nueva)) {
      throw new BadRequestException([
        'La contraseña debe tener al menos 8 caracteres, con mayúscula, minúscula, número y símbolo',
      ]);
    }
    const hash = await bcrypt.hash(dto.nueva, 10);
    // La cuenta se comparte con sistemas en Laravel: se guarda con el prefijo que PHP genera.
    await cuenta.update({ password: hash.replace(/^\$2[ab]\$/, '$2y$') });
  }
}

@Controller('perfil')
@UseGuards(JwtAuthGuard)
export class PerfilController {
  constructor(private readonly perfil: PerfilService) {}

  @Get()
  ver(@Usuario() usuario: UsuarioActual) {
    return this.perfil.ver(usuario.rfc);
  }

  @Put('datos')
  guardarDatos(@Usuario() usuario: UsuarioActual, @Body() dto: DatosDto) {
    return this.perfil.guardarDatos(usuario.rfc, dto);
  }

  @Put('contrasena')
  cambiarContrasena(@Usuario() usuario: UsuarioActual, @Body() dto: ContrasenaDto) {
    return this.perfil.cambiarContrasena(usuario, dto);
  }
}

@Module({
  imports: [CompartidoModule],
  controllers: [PerfilController],
  providers: [PerfilService],
})
export class PerfilModule {}
