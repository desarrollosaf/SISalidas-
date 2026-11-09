import { registerAs } from '@nestjs/config';

/** Tolera espacios y el \r de un .env guardado con saltos de línea de Windows. */
const encendido = (valor: string | undefined) => valor?.trim().toLowerCase() === 'true';

export default registerAs('operacion', () => ({
  checadasActivo: encendido(process.env.CHECADAS_ACTIVO),
  correoActivo: encendido(process.env.CORREO_ACTIVO),
  appUrl: process.env.APP_URL ?? '',
  correo: {
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT ?? '587', 10),
    secure: encendido(process.env.MAIL_SECURE),
    username: process.env.MAIL_USERNAME,
    password: process.env.MAIL_PASSWORD,
    from: process.env.MAIL_FROM ?? 'notifintra@legislativoedomex.gob.mx',
  },
}));
