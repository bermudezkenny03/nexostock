import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { buildCorsOptions } from './common/config/cors.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

export const API_PREFIX = 'api';

export function configureApp(app: INestApplication): void {
  app.use(helmet());
  app.enableCors(buildCorsOptions());
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();
}

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('NexoStock Auth Service')
    .setDescription(
      'Identity for a multi-tenant installation. Each business (tenant) owns its users and roles; modules and permissions are a global catalog. The access token carries businessId, the only source of tenant context for every service.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${API_PREFIX}/docs`, app, document);
}
