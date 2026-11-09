import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AlcanceService } from '../common/alcance.service';
import { PadronService } from '../common/padron.service';
import { DEPENDENCIA_OSFEM } from '../common/reglas';
import { ROL_USUARIO, UsuarioActual } from '../common/usuario-actual';
import { UsersSafs } from '../database/models/padron.models';
import { RolesService } from '../roles/roles.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(UsersSafs, 'external') private readonly cuentas: typeof UsersSafs,
    private readonly roles: RolesService,
    private readonly padron: PadronService,
    private readonly alcance: AlcanceService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(rfc: string, password: string) {
    const cuenta = await this.cuentas.findOne({ where: { rfc: rfc.trim().toUpperCase() } });

    // bcryptjs valida los hashes "$2y$" de Laravel: las contraseñas siguen siendo las mismas.
    if (!cuenta || !(await bcrypt.compare(password, cuenta.password))) {
      throw new UnauthorizedException('RFC o contraseña incorrectos');
    }

    const rol = await this.roles.rolDe(cuenta.rfc);
    const perfil = await this.padron.perfil(cuenta.rfc);
    const esDeOsfem = perfil?.estado === 1 && perfil.idDependencia === DEPENDENCIA_OSFEM;
    // Tener un rol asignado equivale a las excepciones por RFC que Laravel tenía en HomeController.
    if (!esDeOsfem && rol === ROL_USUARIO) {
      throw new UnauthorizedException('Tu cuenta no tiene acceso a este sistema');
    }

    const payload: UsuarioActual = { sub: Number(cuenta.id), rfc: cuenta.rfc, rol };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('auth.jwtSecret'),
      expiresIn: this.config.get<number>('auth.jwtExpiresInSeconds'),
    });
    return { access_token: accessToken, user: await this.usuario(payload) };
  }

  /** Lo que el frontend necesita saber de quien entró. */
  async usuario(usuario: UsuarioActual) {
    const perfil = await this.padron.perfil(usuario.rfc);
    return {
      id: usuario.sub,
      rfc: usuario.rfc,
      nombre: perfil?.nombre ?? usuario.rfc,
      rol: usuario.rol,
      capacidades: await this.alcance.capacidades(usuario),
    };
  }
}
