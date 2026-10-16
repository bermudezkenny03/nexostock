import { Injectable } from '@nestjs/common';
import { internalRequest, rethrowUpstream, serviceUrl } from '@nexostock/common';

export interface BusinessStatus {
  id: string;
  isActive: boolean;
  planCode: string;
  planName: string;
  maxProducts: number | null;
}

@Injectable()
export class AuthClient {
  async status(businessId: string): Promise<BusinessStatus> {
    try {
      return await internalRequest<BusinessStatus>(
        serviceUrl('AUTH_SERVICE_URL', 'http://localhost:3001'),
        { path: `/api/internal/businesses/${businessId}/status` },
      );
    } catch (error) {
      rethrowUpstream(error);
    }
  }
}

@Injectable()
export class InventoryClient {
  async ensure(
    productId: string,
    accessToken: string,
    minQuantity?: number,
  ): Promise<void> {
    try {
      await internalRequest(
        serviceUrl('INVENTORY_SERVICE_URL', 'http://localhost:3003'),
        {
          method: 'POST',
          path: '/api/internal/stock/ensure',
          accessToken,
          body: { productId, minQuantity },
        },
      );
    } catch (error) {
      rethrowUpstream(error);
    }
  }
}
