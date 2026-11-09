import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresInSeconds: parseInt(
    process.env.JWT_EXPIRES_IN_SECONDS ?? '28800',
    10,
  ),
}));
