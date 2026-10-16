import type {
  NewSale,
  SalePage,
  SaleRecord,
  SaleStatus,
  SalesSeriesPoint,
  SalesSummary,
  TopProduct,
} from './sale';

export const SALE_REPOSITORY = Symbol('SaleRepository');

export interface SaleListCriteria {
  businessId: string;
  status?: SaleStatus;
  page: number;
  pageSize: number;
}

export interface DateWindow {
  from: Date;
  to: Date;
}

export interface SaleRepository {
  list(criteria: SaleListCriteria): Promise<SalePage>;
  findOwned(id: string, businessId: string): Promise<SaleRecord | null>;
  findByIdempotency(businessId: string, idempotencyKey: string): Promise<SaleRecord | null>;
  createPending(data: NewSale): Promise<SaleRecord>;
  markFailed(id: string, failureCode: string, failureReason: string): Promise<void>;
  markConfirmed(id: string): Promise<SaleRecord>;
  markCancelled(id: string): Promise<SaleRecord>;
  summary(businessId: string, range: DateWindow): Promise<SalesSummary>;
  series(businessId: string, range: DateWindow): Promise<SalesSeriesPoint[]>;
  topProducts(businessId: string, range: DateWindow, limit: number): Promise<TopProduct[]>;
}
