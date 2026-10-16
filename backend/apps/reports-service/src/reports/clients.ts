import { Injectable } from '@nestjs/common';
import { internalRequest, rethrowUpstream, serviceUrl } from '@nexostock/common';

export interface StockAlert {
  productId: string;
  quantity: number;
  minQuantity: number;
  updatedAt: string;
}

export interface ProductQuote {
  id: string;
  sku: string;
  name: string;
  price: string;
  isActive: boolean;
}

@Injectable()
export class ReportsClients {
  async productSummary(accessToken: string): Promise<{ active: number; total: number }> {
    return this.get(serviceUrl('PRODUCTS_SERVICE_URL', 'http://localhost:3002'), '/api/internal/products/summary', accessToken);
  }

  async quote(accessToken: string, productIds: string[]): Promise<ProductQuote[]> {
    try {
      return await internalRequest<ProductQuote[]>(
        serviceUrl('PRODUCTS_SERVICE_URL', 'http://localhost:3002'),
        {
          method: 'POST',
          path: '/api/internal/products/quote',
          accessToken,
          body: { productIds, includeInactive: true },
        },
      );
    } catch (error) {
      rethrowUpstream(error);
    }
  }

  async stockSummary(accessToken: string) {
    return this.get<{ skuCount: number; units: number; lowStock: number }>(
      serviceUrl('INVENTORY_SERVICE_URL', 'http://localhost:3003'),
      '/api/internal/stock/summary',
      accessToken,
    );
  }

  async stockAlerts(accessToken: string): Promise<StockAlert[]> {
    return this.get(
      serviceUrl('INVENTORY_SERVICE_URL', 'http://localhost:3003'),
      '/api/internal/stock/alerts',
      accessToken,
    );
  }

  async salesSummary(accessToken: string, query: string) {
    return this.get<{ from: string; to: string; count: number; total: string }>(
      serviceUrl('SALES_SERVICE_URL', 'http://localhost:3004'),
      `/api/internal/sales/summary${query}`,
      accessToken,
    );
  }

  async salesSeries(accessToken: string, query: string) {
    return this.get(
      serviceUrl('SALES_SERVICE_URL', 'http://localhost:3004'),
      `/api/internal/sales/series${query}`,
      accessToken,
    );
  }

  async topProducts(accessToken: string, query: string) {
    return this.get(
      serviceUrl('SALES_SERVICE_URL', 'http://localhost:3004'),
      `/api/internal/sales/top-products${query}`,
      accessToken,
    );
  }

  private async get<T>(baseUrl: string, path: string, accessToken: string): Promise<T> {
    try {
      return await internalRequest<T>(baseUrl, { path, accessToken });
    } catch (error) {
      rethrowUpstream(error);
    }
  }
}
