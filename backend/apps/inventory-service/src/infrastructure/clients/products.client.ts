import { Injectable } from '@nestjs/common';
import { internalRequest, rethrowUpstream, serviceUrl } from '@nexostock/common';

interface QuotedProduct {
  id: string;
}

@Injectable()
export class ProductsClient {
  async exists(productId: string, accessToken: string): Promise<boolean> {
    try {
      const rows = await internalRequest<QuotedProduct[]>(
        serviceUrl('PRODUCTS_SERVICE_URL', 'http://localhost:3002'),
        {
          method: 'POST',
          path: '/api/internal/products/quote',
          accessToken,
          body: { productIds: [productId], includeInactive: true },
        },
      );
      return rows.some((row) => row.id === productId);
    } catch (error) {
      rethrowUpstream(error);
    }
  }
}
