import { Injectable } from '@nestjs/common';
import { internalRequest, rethrowUpstream, serviceUrl } from '@nexostock/common';
import type { ProductQuote } from '../../domain/pricing';

interface StockChange {
  referenceType: 'SALE' | 'SALE_CANCEL';
  referenceId: string;
  lines: { productId: string; quantity: number }[];
}

@Injectable()
export class CatalogClient {
  async quote(productIds: string[], accessToken: string): Promise<ProductQuote[]> {
    try {
      return await internalRequest<ProductQuote[]>(
        serviceUrl('PRODUCTS_SERVICE_URL', 'http://localhost:3002'),
        {
          method: 'POST',
          path: '/api/internal/products/quote',
          accessToken,
          body: { productIds },
        },
      );
    } catch (error) {
      rethrowUpstream(error);
    }
  }
}

@Injectable()
export class InventoryClient {
  async deduct(
    accessToken: string,
    idempotencyKey: string,
    body: StockChange,
  ): Promise<void> {
    await this.change('deduct', accessToken, idempotencyKey, body);
  }

  async release(
    accessToken: string,
    idempotencyKey: string,
    body: StockChange,
  ): Promise<void> {
    await this.change('release', accessToken, idempotencyKey, body);
  }

  private async change(
    action: 'deduct' | 'release',
    accessToken: string,
    idempotencyKey: string,
    body: StockChange,
  ): Promise<void> {
    try {
      await internalRequest(serviceUrl('INVENTORY_SERVICE_URL', 'http://localhost:3003'), {
        method: 'POST',
        path: `/api/internal/stock/${action}`,
        accessToken,
        idempotencyKey,
        body,
      });
    } catch (error) {
      rethrowUpstream(error);
    }
  }
}
