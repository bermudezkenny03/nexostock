import type {
  IdempotencySnapshot,
  MovementRecord,
  Page,
  StockMutation,
  StockView,
} from './stock';

export const STOCK_REPOSITORY = Symbol('StockRepository');

export interface StockListCriteria {
  businessId: string;
  productId?: string;
  page: number;
  pageSize: number;
}

export interface QuantitySnapshot {
  quantity: number;
  minQuantity: number;
}

export interface StockRepository {
  list(criteria: StockListCriteria): Promise<Page<StockView>>;
  findOne(businessId: string, productId: string): Promise<StockView | null>;
  updateMin(businessId: string, productId: string, minQuantity: number): Promise<number>;
  listForBusiness(businessId: string): Promise<StockView[]>;
  quantities(businessId: string): Promise<QuantitySnapshot[]>;
  movements(criteria: StockListCriteria): Promise<Page<MovementRecord>>;
  ensure(input: {
    businessId: string;
    productId: string;
    minQuantity?: number;
  }): Promise<StockView>;
  findIdempotency(businessId: string, key: string): Promise<IdempotencySnapshot | null>;
  transaction<T>(work: (tx: StockMutation) => Promise<T>): Promise<T>;
}
