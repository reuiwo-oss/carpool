import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT ?? 3000;
  const origins = process.env.CORS_ORIGIN?.split(',').map((s) => s.trim());

  app.enableCors({
  origin: origins ?? process.env.NODE_ENV !== 'production',
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.listen(port, '0.0.0.0');
}
bootstrap();
