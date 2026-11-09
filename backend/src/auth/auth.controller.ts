import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Usuario, type UsuarioActual } from '../common/usuario-actual';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.rfc, dto.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Usuario() usuario: UsuarioActual) {
    return this.auth.usuario(usuario);
  }
}
