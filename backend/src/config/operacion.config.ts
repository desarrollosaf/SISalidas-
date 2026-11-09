import { registerAs } from '@nestjs/config';

export default registerAs('operacion', () => ({
  checadasActivo: process.env.CHECADAS_ACTIVO === 'true',
  correoActivo: process.env.CORREO_ACTIVO === 'true',
  appUrl: process.env.APP_URL ?? '',
  correo: {
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT ?? '587', 10),
    secure: process.env.MAIL_SECURE === 'true',
    username: process.env.MAIL_USERNAME,
    password: process.env.MAIL_PASSWORD,
    from: process.env.MAIL_FROM ?? 'notifintra@legislativoedomex.gob.mx',
  },
}));
