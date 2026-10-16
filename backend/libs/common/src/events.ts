export interface StockLine {
  productId: string;
  quantity: number;
}

export interface StockChangeRequested {
  businessId: string;
  referenceType: 'SALE' | 'SALE_CANCEL';
  referenceId: string;
  lines: StockLine[];
}

export interface SaleConfirmed {
  businessId: string;
  saleId: string;
  total: string;
}

export interface ProductStockOpened {
  businessId: string;
  productId: string;
  minQuantity: number;
}
