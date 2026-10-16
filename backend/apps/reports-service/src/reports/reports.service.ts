import { Injectable } from '@nestjs/common';
import { RangeQueryDto } from './dto/range.dto';
import { ReportsClients } from './clients';

function queryString(query: RangeQueryDto): string {
  const params = new URLSearchParams();
  if (query.from) {
    params.set('from', query.from);
  }
  if (query.to) {
    params.set('to', query.to);
  }
  if (query.limit) {
    params.set('limit', String(query.limit));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

@Injectable()
export class ReportsService {
  constructor(private readonly clients: ReportsClients) {}

  async overview(accessToken: string, query: RangeQueryDto) {
    const [products, inventory, sales] = await Promise.all([
      this.clients.productSummary(accessToken),
      this.clients.stockSummary(accessToken),
      this.clients.salesSummary(accessToken, queryString(query)),
    ]);
    return { products, inventory, sales };
  }

  async lowStock(accessToken: string) {
    const alerts = await this.clients.stockAlerts(accessToken);
    if (alerts.length === 0) {
      return [];
    }
    const quotes = await this.clients.quote(
      accessToken,
      alerts.map((alert) => alert.productId),
    );
    const byId = new Map(quotes.map((quote) => [quote.id, quote]));
    return alerts.map((alert) => {
      const product = byId.get(alert.productId);
      return {
        ...alert,
        sku: product?.sku ?? null,
        name: product?.name ?? null,
      };
    });
  }

  sales(accessToken: string, query: RangeQueryDto) {
    return this.clients.salesSeries(accessToken, queryString(query));
  }

  topProducts(accessToken: string, query: RangeQueryDto) {
    return this.clients.topProducts(accessToken, queryString(query));
  }
}
