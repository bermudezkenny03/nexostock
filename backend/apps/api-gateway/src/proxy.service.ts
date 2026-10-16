import { Injectable, Logger } from '@nestjs/common';
import {
  ErrorCode,
  readBearerToken,
  serviceUrl,
  verifyAccessToken,
} from '@nexostock/common';
import { request as httpRequest, type IncomingMessage, type RequestOptions } from 'node:http';
import { request as httpsRequest } from 'node:https';
import type { Request, Response } from 'express';
import { BusinessStatusCache } from './business-status.cache';
import { forwardedHeaders, resolveRequestId } from './headers';
import { resolveGatewayRoute, type UpstreamName } from './routes';

const STATUS_TEXT: Record<number, string> = {
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  constructor(private readonly businessStatus: BusinessStatusCache) {}

  async handle(req: Request, res: Response): Promise<void> {
    const requestId = resolveRequestId(req.headers['x-request-id']);
    res.setHeader('X-Request-Id', requestId);
    const route = resolveGatewayRoute(req.originalUrl || req.url);

    if (route === 'internal' || route === null) {
      this.send(res, req, 404, ErrorCode.ROUTE_NOT_FOUND, 'Ruta no encontrada');
      return;
    }
    if (route === 'local') {
      return;
    }

    if (route.auth === 'required') {
      const token = readBearerToken(req.header('authorization'));
      if (!token) {
        this.send(res, req, 401, ErrorCode.UNAUTHENTICATED, 'Token inválido o ausente');
        return;
      }
      try {
        const payload = verifyAccessToken(token);
        const active = await this.businessStatus.isActive(payload.businessId);
        if (active === false) {
          this.send(res, req, 403, ErrorCode.BUSINESS_SUSPENDED, 'El negocio está suspendido');
          return;
        }
      } catch {
        this.send(res, req, 401, ErrorCode.UNAUTHENTICATED, 'Token inválido o ausente');
        return;
      }
    }

    this.forward(req, res, this.upstreamBase(route.upstream), requestId);
  }

  async upstreamHealth(): Promise<Record<UpstreamName, 'up' | 'down'>> {
    const names: UpstreamName[] = ['auth', 'products', 'inventory', 'sales', 'reports'];
    const timeoutMs = Number.parseInt(process.env.UPSTREAM_TIMEOUT_MS ?? '1500', 10);
    const checks = await Promise.all(
      names.map(async (name) => {
        try {
          const response = await fetch(`${this.upstreamBase(name)}/api/health`, {
            signal: AbortSignal.timeout(timeoutMs),
          });
          return [name, response.ok ? 'up' : 'down'] as const;
        } catch {
          return [name, 'down'] as const;
        }
      }),
    );
    return Object.fromEntries(checks) as Record<UpstreamName, 'up' | 'down'>;
  }

  private upstreamBase(name: UpstreamName): string {
    switch (name) {
      case 'auth':
        return serviceUrl('AUTH_SERVICE_URL', 'http://127.0.0.1:3001');
      case 'products':
        return serviceUrl('PRODUCTS_SERVICE_URL', 'http://127.0.0.1:3002');
      case 'inventory':
        return serviceUrl('INVENTORY_SERVICE_URL', 'http://127.0.0.1:3003');
      case 'sales':
        return serviceUrl('SALES_SERVICE_URL', 'http://127.0.0.1:3004');
      case 'reports':
        return serviceUrl('REPORTS_SERVICE_URL', 'http://127.0.0.1:3005');
    }
  }

  private forward(req: Request, res: Response, baseUrl: string, requestId: string): void {
    const target = new URL(baseUrl);
    const transport = target.protocol === 'https:' ? httpsRequest : httpRequest;
    const headers = forwardedHeaders(
      req.headers,
      requestId,
      req.ip || req.socket.remoteAddress || '',
    );
    const options: RequestOptions = {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port,
      method: req.method,
      path: req.originalUrl || req.url,
      headers,
      timeout: Number.parseInt(process.env.PROXY_TIMEOUT_MS ?? '8000', 10),
    };

    let settled = false;
    const fail = (status: number, code: string, message: string) => {
      if (settled || res.headersSent) {
        return;
      }
      settled = true;
      this.send(res, req, status, code, message);
    };

    const proxyReq = transport(options, (proxyRes: IncomingMessage) => {
      settled = true;
      const responseHeaders = { ...proxyRes.headers, 'x-request-id': requestId };
      delete responseHeaders['transfer-encoding'];
      res.writeHead(proxyRes.statusCode ?? 502, responseHeaders);
      proxyRes.pipe(res);
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      fail(504, ErrorCode.UPSTREAM_TIMEOUT, 'El servicio no respondió a tiempo');
    });
    proxyReq.on('error', () => {
      fail(503, ErrorCode.UPSTREAM_UNAVAILABLE, 'El servicio no está disponible. Intenta de nuevo.');
    });
    req.pipe(proxyReq);
    this.logger.log(`${req.method} ${req.originalUrl} -> ${baseUrl} ${requestId}`);
  }

  private send(
    res: Response,
    req: Request,
    statusCode: number,
    code: string,
    message: string,
  ): void {
    if (res.headersSent) {
      return;
    }
    res.status(statusCode).json({
      statusCode,
      message,
      error: STATUS_TEXT[statusCode] ?? 'Error',
      code,
      timestamp: new Date().toISOString(),
      path: req.originalUrl || req.url,
    });
  }
}
