/**
 * Hand-written: reports-service has no @ApiProperty schemas, so its OpenAPI
 * document cannot generate these. Source: reports/reports.service.ts.
 */
export interface ReportsOverview {
  products: { active: number; total: number };
  inventory: { skuCount: number; units: number; lowStock: number };
  sales: { from: string; to: string; count: number; total: string };
}

export interface LowStockItem {
  productId: string;
  quantity: number;
  minQuantity: number;
  updatedAt: string;
  sku: string | null;
  name: string | null;
}

export interface DateRange {
  from?: string;
  to?: string;
}
