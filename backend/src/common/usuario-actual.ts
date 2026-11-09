import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const ROL_ADMINISTRADOR = 'administrador';
/** Ve el reporte de toda la institución. */
export const ROL_REPORTE_GENERAL = 'reporte_general';
/** Puede entrar aunque no sea de OSFEM. */
export const ROL_ACCESO_EXTERNO = 'acceso_externo';
export const ROL_USUARIO = 'usuario';

/** Lo que guarda el token: `sub` es `users_safs.id`. */
export interface UsuarioActual {
  sub: number;
  rfc: string;
  rol: string;
}

/** Inyecta en el handler el payload del token que dejó JwtAuthGuard en `request.user`. */
export const Usuario = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioActual => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request['user'] as UsuarioActual;
  },
);
