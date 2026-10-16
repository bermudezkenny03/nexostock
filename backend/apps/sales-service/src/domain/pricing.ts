import { addMoney, multiplyMoney } from '@nexostock/common';

export class InvalidSaleDraft extends Error {
  constructor() {
    super('Uno o más productos no existen o están inactivos');
  }
}

export interface SaleItemInput {
  productId: string;
  quantity: number;
}

export interface ProductQuote {
  id: string;
  sku: string;
  name: string;
  price: string;
  isActive: boolean;
}

export interface DraftLine {
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}

export interface SaleDraft {
  lines: DraftLine[];
  total: string;
}

export function mergeItems(items: readonly SaleItemInput[]): SaleItemInput[] {
  const quantities = new Map<string, number>();
  for (const item of items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }
  return [...quantities.entries()].map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

export function buildSaleDraft(
  items: readonly SaleItemInput[],
  quotes: readonly ProductQuote[],
): SaleDraft {
  const merged = mergeItems(items);
  const byId = new Map(quotes.map((quote) => [quote.id, quote]));
  const lines: DraftLine[] = merged.map((item) => {
    const product = byId.get(item.productId);
    if (!product || !product.isActive) {
      throw new InvalidSaleDraft();
    }
    return {
      productId: product.id,
      sku: product.sku,
      productName: product.name,
      quantity: item.quantity,
      unitPrice: product.price,
      lineTotal: multiplyMoney(product.price, item.quantity),
    };
  });
  return { lines, total: addMoney(lines.map((line) => line.lineTotal)) };
}
