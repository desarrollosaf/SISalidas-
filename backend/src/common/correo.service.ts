import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

const ASUNTO = 'Sistema de notificación de permisos';
const FIRMA = 'ÓRGANO SUPERIOR DE FISCALIZACIÓN<br>DEL ESTADO DE MÉXICO';

const escapar = (texto: unknown) =>
  String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Avisos por correo. Un correo que falla nunca debe tumbar la operación que lo originó (en Laravel
 * un error de SMTP dejaba el permiso guardado pero le mostraba al usuario una página de error).
 */
@Injectable()
export class CorreoService {
  private readonly logger = new Logger(CorreoService.name);

  constructor(private readonly config: ConfigService) {}

  /** Al jefe, cuando alguien de su área solicita un permiso. */
  solicitudNueva(para: string, solicitante: string): Promise<void> {
    return this.enviar(
      para,
      `<p><strong>${escapar(solicitante)}</strong> registró una solicitud en el Sistema de notificación de permisos, por lo que se solicita su validación para poder efectuarla.</p>`,
    );
  }

  /** Al jefe, cuando alguien con permiso registra su salida o entrada en el checador. */
  checadaRegistrada(
    para: string,
    datos: { jefe: string; dependencia: string; servidor: string; tipo: string; fechaHora: string },
  ): Promise<void> {
    return this.enviar(
      para,
      `<p>${escapar(datos.jefe)}<br>${escapar(datos.dependencia)}<br>PRESENTE</p>
       <p>La persona servidora pública <strong>${escapar(datos.servidor)}</strong> ha registrado una ${escapar(datos.tipo)} a las ${escapar(datos.fechaHora)}.</p>
       <p>ATENTAMENTE<br>${FIRMA}</p>`,
    );
  }

  /** Al solicitante, cuando su permiso se resuelve. El texto legal es el mismo que en Laravel. */
  solicitudResuelta(
    para: string,
    datos: {
      servidor: string;
      dependencia: string;
      fecha: string;
      horaSalida: string;
      horaRegreso: string | null;
      estado: 'Procedente' | 'Improcedente';
    },
  ): Promise<void> {
    const horario = datos.horaRegreso
      ? `en un horario de ${escapar(datos.horaSalida)} a ${escapar(datos.horaRegreso)}`
      : `a partir de las ${escapar(datos.horaSalida)}`;
    return this.enviar(
      para,
      `<p>${escapar(datos.servidor)}<br>${escapar(datos.dependencia)}<br>PRESENTE</p>
       <p>Anticipando un saludo, con relación a su solicitud de permiso del día ${escapar(datos.fecha)} para ausentarse dentro de la jornada laboral ${horario}, con fundamento en lo dispuesto en los artículos 30 y 31 del Reglamento de las Condiciones Generales de Trabajo del Poder Legislativo del Estado de México, hago de su conocimiento que su solicitud ha sido resuelta de manera <strong>${escapar(datos.estado)}</strong>.</p>
       <p>Lo anterior, de conformidad con los artículos 18 fracción VI; 20 fracción II; 24 fracción X y 25 fracciones IV, V y XI del Reglamento Interior del Órgano Superior de Fiscalización del Estado de México.</p>
       <p>Sin otro particular por el momento, aprovecho la ocasión para enviarle un cordial saludo.</p>
       <p>ATENTAMENTE<br>${FIRMA}</p>`,
    );
  }

  private async enviar(para: string, cuerpo: string): Promise<void> {
    if (!this.config.get<boolean>('operacion.correoActivo')) {
      this.logger.log('Correo desactivado; no se envió el aviso');
      return;
    }
    const smtp = this.config.get<{
      host: string;
      port: number;
      secure: boolean;
      username?: string;
      password?: string;
      from: string;
    }>('operacion.correo')!;
    const url = this.config.get<string>('operacion.appUrl');
    try {
      const transporte = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: smtp.username ? { user: smtp.username, pass: smtp.password } : undefined,
      });
      await transporte.sendMail({
        from: smtp.from,
        to: para,
        subject: ASUNTO,
        html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#1e1619;max-width:560px">
          ${cuerpo}
          ${url ? `<p style="margin-top:24px"><a href="${escapar(url)}" style="background:#960948;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none">Ingresar</a></p>` : ''}
        </div>`,
      });
    } catch (error) {
      this.logger.error('No se pudo enviar el aviso', error instanceof Error ? error.stack : error);
    }
  }
}
