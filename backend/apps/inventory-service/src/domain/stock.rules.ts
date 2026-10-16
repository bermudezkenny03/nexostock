export type StockDirection = 'IN' | 'OUT';

export function quantityAfter(
  current: number,
  direction: StockDirection,
  amount: number,
): number | null {
  if (!Number.isInteger(amount) || amount <= 0) {
    return null;
  }
  if (direction === 'IN') {
    return current + amount;
  }
  if (current < amount) {
    return null;
  }
  return current - amount;
}
