import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp, setupSwagger } from './app.setup';
import { assertProductionJwtSecret } from './common/config/jwt.config';

async function bootstrap(): Promise<void> {
  assertProductionJwtSecret();
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const swaggerEnabled =
    (process.env.SWAGGER_ENABLED ??
      String(process.env.NODE_ENV !== 'production')) === 'true';
  if (swaggerEnabled) {
    setupSwagger(app);
  }

  const port = Number.parseInt(process.env.PORT ?? '3001', 10);
  await app.listen(port);
  Logger.log(`Auth service listening on port ${port}`, 'Bootstrap');
}

void bootstrap();
