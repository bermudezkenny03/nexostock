import { type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { buildCorsOptions } from '@nexostock/common';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ProxyService } from './proxy.service';

export async function createGateway(): Promise<INestApplication> {
  const server = express();
  server.disable('x-powered-by');
  server.set('trust proxy', 1);
  server.use(helmet());
  server.use(cors(buildCorsOptions()));

  let handle: express.RequestHandler = (_req, _res, next) => next();
  server.use((req, res, next) => handle(req, res, next));

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    bodyParser: false,
  });
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  const proxy = app.get(ProxyService);
  handle = (req, res, next) => {
    if (req.method === 'GET' && req.path === '/api/health') {
      next();
      return;
    }
    void proxy.handle(req, res);
  };

  await app.init();
  return app;
}
