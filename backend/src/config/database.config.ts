import { registerAs } from '@nestjs/config';

const conexion = (prefijo: string) => ({
  host: process.env[`${prefijo}_HOST`],
  port: parseInt(process.env[`${prefijo}_PORT`] ?? '3306', 10),
  username: process.env[`${prefijo}_USERNAME`],
  password: process.env[`${prefijo}_PASSWORD`],
  database: process.env[`${prefijo}_DATABASE`],
});

export default registerAs('database', () => ({
  main: conexion('DB'),
  external: conexion('DB_EXTERNAL'),
  directorio: conexion('DB_DIRECTORIO'),
  checadores: conexion('DB_CHECADORES'),
}));
