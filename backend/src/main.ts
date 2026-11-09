import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  // Sin secreto cualquiera podría firmar tokens válidos: mejor no arrancar.
  if (!process.env.JWT_SECRET) {
    throw new Error('Falta JWT_SECRET en el archivo .env');
  }
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.listen(process.env.PORT ?? 3070);
}
void bootstrap();
