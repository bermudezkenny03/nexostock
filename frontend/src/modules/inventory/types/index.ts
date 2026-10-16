/**
 * Hand-written: inventory-service DTOs have no @ApiProperty schemas.
 * Source: inventory-service application/stock.service.ts (StockView).
 */
export interface StockView {
  productId: string;
  quantity: number;
  minQuantity: number;
  updatedAt: string;
}
