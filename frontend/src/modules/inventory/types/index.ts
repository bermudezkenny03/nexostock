/**
 * Hand-written: inventory-service DTOs have no @ApiProperty schemas.
 * Source: domain/stock.ts.
 */
export interface StockView {
  productId: string;
  quantity: number;
  minQuantity: number;
  updatedAt: string;
}

export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

export interface Movement {
  id: string;
  businessId: string;
  stockItemId: string;
  productId: string;
  type: MovementType;
  quantity: number;
  stockAfter: number;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface StockListQuery {
  productId?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateMovementPayload {
  productId: string;
  type: MovementType;
  quantity: number;
  reason?: string;
}

export interface UpdateMinQuantityPayload {
  minQuantity: number;
}
