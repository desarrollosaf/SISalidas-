import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

// Traduce las frases más comunes que arma class-validator, para no mostrarle al usuario
// mensajes de error en inglés (ej. "diasHabilesPromesaPago must be an integer number").
const REEMPLAZOS: [RegExp, string][] = [
  [/should not be empty/g, 'no debe estar vacío'],
  [
    /must be longer than or equal to (\d+) characters/g,
    'debe tener al menos $1 caracteres',
  ],
  [
    /must be shorter than or equal to (\d+) characters/g,
    'debe tener máximo $1 caracteres',
  ],
  [/must be a string/g, 'debe ser texto'],
  [/must be an integer number/g, 'debe ser un número entero'],
  [
    /must be a number conforming to the specified constraints/g,
    'debe ser un número válido',
  ],
  [/must be a number/g, 'debe ser un número'],
  [/must be a valid ISO 8601 date string/g, 'debe ser una fecha válida'],
  [/must be a boolean value/g, 'debe ser verdadero o falso'],
  [/must be a valid enum value/g, 'tiene un valor no permitido'],
];

function traducir(mensaje: string): string {
  return REEMPLAZOS.reduce(
    (acumulado, [patron, reemplazo]) => acumulado.replace(patron, reemplazo),
    mensaje,
  );
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      if (
        typeof body === 'object' &&
        body !== null &&
        Array.isArray((body as { message?: unknown }).message)
      ) {
        const original = body as { message: string[] };
        // Sin repetidos: varias reglas de un mismo campo pueden compartir el mismo mensaje.
        const mensajes = [...new Set(original.message.map(traducir))];
        response.status(status).json({ ...original, message: mensajes });
        return;
      }

      response.status(status).json(body);
      return;
    }

    // Error inesperado (ej. una columna que no soporta el texto capturado): se registra
    // completo en el servidor, pero al usuario solo se le muestra un mensaje genérico en español.
    // Los errores de Sequelize traen el mensaje de MySQL en `parent`; sin él solo se vería "Error".
    const sql = (
      exception as { parent?: { sqlMessage?: string; sql?: string } }
    )?.parent;
    this.logger.error(
      `Error no controlado${sql?.sqlMessage ? `: ${sql.sqlMessage}` : ''}`,
      exception instanceof Error ? exception.stack : exception,
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message:
        'Ocurrió un error inesperado. Intenta de nuevo o contacta al administrador.',
    });
  }
}
