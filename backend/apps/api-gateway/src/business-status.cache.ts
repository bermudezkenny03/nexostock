import { Injectable, Logger } from '@nestjs/common';
import { internalRequest, serviceUrl } from '@nexostock/common';

interface CachedStatus {
  isActive: boolean;
  expiresAt: number;
}

@Injectable()
export class BusinessStatusCache {
  private readonly logger = new Logger(BusinessStatusCache.name);
  private readonly entries = new Map<string, CachedStatus>();

  async isActive(businessId: string): Promise<boolean | undefined> {
    const now = Date.now();
    const cached = this.entries.get(businessId);
    if (cached && cached.expiresAt > now) {
      return cached.isActive;
    }

    const ttl = Number.parseInt(process.env.BUSINESS_STATUS_CACHE_TTL_MS ?? '30000', 10);
    const timeoutMs = Number.parseInt(process.env.UPSTREAM_TIMEOUT_MS ?? '1500', 10);
    try {
      const status = await internalRequest<{ isActive: boolean }>(
        serviceUrl('AUTH_SERVICE_URL', 'http://127.0.0.1:3001'),
        {
          path: `/api/internal/businesses/${businessId}/status`,
          timeoutMs,
        },
      );
      this.entries.set(businessId, { isActive: status.isActive, expiresAt: now + ttl });
      return status.isActive;
    } catch (error) {
      this.logger.warn(
        `Business status unavailable for ${businessId}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return cached?.isActive;
    }
  }
}
