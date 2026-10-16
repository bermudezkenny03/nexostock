import { Controller, Get } from '@nestjs/common';
import { ProxyService } from './proxy.service';

@Controller()
export class AppController {
  constructor(private readonly proxyService: ProxyService) {}

  @Get('health')
  async health() {
    const upstreams = await this.proxyService.upstreamHealth();
    const degraded = Object.values(upstreams).some((status) => status !== 'up');
    return {
      status: degraded ? 'degraded' : 'ok',
      service: 'api-gateway',
      upstreams,
    };
  }
}
