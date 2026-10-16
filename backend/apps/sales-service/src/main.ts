import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { assertProductionSecrets } from '@nexostock/common';
import { AppModule } from './app.module';
import { configureApp, setupSwagger } from './app.setup';

async function bootstrap(): Promise<void> {
  assertProductionSecrets();
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const swaggerEnabled =
    (process.env.SWAGGER_ENABLED ??
      String(process.env.NODE_ENV !== 'production')) === 'true';
  if (swaggerEnabled) {
    setupSwagger(app, 'NexoStock Sales Service', 'Registro de ventas y descuento de inventario.');
  }
  const port = Number.parseInt(process.env.PORT ?? '3004', 10);
  await app.listen(port);
  Logger.log(`Sales service listening on port ${port}`, 'Bootstrap');
}

void bootstrap();
