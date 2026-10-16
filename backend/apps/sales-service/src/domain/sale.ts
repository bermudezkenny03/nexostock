export type SaleStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';

export interface SaleLineRecord {
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}

export interface SaleRecord {
  id: string;
  status: SaleStatus;
  total: string;
  note: string | null;
  createdBy: string;
  requestHash: string | null;
  failureCode: string | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  lines: SaleLineRecord[];
}

export interface SaleView {
  id: string;
  status: SaleStatus;
  total: string;
  note: string | null;
  createdBy: string;
  failureCode: string | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  lines: SaleLineRecord[];
}

export interface SalePage {
  items: SaleView[];
  total: number;
  page: number;
  pageSize: number;
}

export class DuplicateSaleKey extends Error {
  constructor() {
    super('DUPLICATE_SALE_KEY');
  }
}

export interface NewSale {
  businessId: string;
  total: string;
  note: string | null;
  createdBy: string;
  idempotencyKey?: string;
  requestHash: string;
  lines: SaleLineRecord[];
}

export interface SalesSummary {
  count: number;
  total: string;
}

export interface SalesSeriesPoint {
  day: string;
  count: number;
  total: string;
}

export interface TopProduct {
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  total: string;
}
