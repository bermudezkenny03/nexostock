import { quantityAfter } from './stock.rules';

describe('quantityAfter', () => {
  it('adds entries and blocks exits that would go negative', () => {
    expect(quantityAfter(5, 'IN', 2)).toBe(7);
    expect(quantityAfter(5, 'OUT', 5)).toBe(0);
    expect(quantityAfter(5, 'OUT', 6)).toBeNull();
  });

  it('rejects a non-positive amount', () => {
    expect(quantityAfter(5, 'OUT', 0)).toBeNull();
  });
});
