/**
 * Hand-written: sales-service DTOs have no @ApiProperty schemas.
 * Source: domain/sale.ts and infrastructure/http/dto/sale.dto.ts.
 */
export type SaleStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';

export interface SaleLine {
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}

export interface Sale {
  id: string;
  status: SaleStatus;
  total: string;
  note: string | null;
  createdBy: string;
  failureCode: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  lines: SaleLine[];
}

export interface SaleListQuery {
  status?: SaleStatus;
  page?: number;
  pageSize?: number;
}

export interface CreateSalePayload {
  items: { productId: string; quantity: number }[];
  note?: string;
}
