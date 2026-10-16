import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp, setupSwagger } from './app.setup';
import { assertProductionJwtSecret } from './common/config/jwt.config';

function assertProductionInternalKey(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }
  const key = process.env.INTERNAL_API_KEY?.trim();
  if (!key || key === 'local-dev-internal-key' || key.length < 16) {
    throw new Error(
      'INTERNAL_API_KEY must be set to a unique value when NODE_ENV=production',
    );
  }
}

async function bootstrap(): Promise<void> {
  assertProductionJwtSecret();
  assertProductionInternalKey();
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
