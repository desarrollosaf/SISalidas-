import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROL_ADMINISTRADOR } from '../common/usuario-actual';
import { RolesService } from './roles.service';

class AsignarRolDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  rfc: string;

  @IsString()
  @IsNotEmpty()
  rol: string;
}

@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROL_ADMINISTRADOR)
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  async listar() {
    const [catalogo, asignaciones] = await Promise.all([
      this.roles.catalogo(),
      this.roles.listar(),
    ]);
    return { catalogo, asignaciones };
  }

  @Put()
  asignar(@Body() dto: AsignarRolDto) {
    return this.roles.asignar(dto.rfc.trim().toUpperCase(), dto.rol);
  }

  @Delete(':rfc')
  quitar(@Param('rfc') rfc: string) {
    return this.roles.quitar(rfc);
  }
}
