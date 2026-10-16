export interface StockView {
  productId: string;
  quantity: number;
  minQuantity: number;
  updatedAt: Date;
}

export interface StockRow extends StockView {
  id: string;
}

export interface AppliedLine {
  productId: string;
  quantity: number;
  stockAfter: number;
}

export interface MovementRecord {
  id: string;
  businessId: string;
  stockItemId: string;
  productId: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  stockAfter: number;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdBy: string | null;
  createdAt: Date;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IdempotencySnapshot {
  requestHash: string;
  responseBody: unknown;
}

export class IdempotencyRace extends Error {
  constructor() {
    super('IDEMPOTENCY_RACE');
  }
}

export interface MovementMeta {
  reason?: string;
  referenceType?: string;
  referenceId?: string;
}

export interface StockMutation {
  findIdempotency(businessId: string, key: string): Promise<IdempotencySnapshot | null>;
  saveIdempotency(input: {
    businessId: string;
    key: string;
    requestHash: string;
    responseBody: unknown;
  }): Promise<void>;
  applyQuantityChange(input: {
    businessId: string;
    productId: string;
    direction: 'IN' | 'OUT';
    quantity: number;
  }): Promise<number>;
  requireStock(businessId: string, productId: string): Promise<StockRow>;
  recordMovement(input: {
    businessId: string;
    stockItemId: string;
    productId: string;
    type: 'IN' | 'OUT' | 'ADJUSTMENT';
    quantity: number;
    stockAfter: number;
    reason?: string;
    referenceType?: string;
    referenceId?: string;
    createdBy: string;
  }): Promise<void>;
  findForAdjust(businessId: string, productId: string): Promise<StockRow | null>;
  compareAndSetQuantity(id: string, expected: number, next: number): Promise<number>;
}
