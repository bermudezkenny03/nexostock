import { InvalidSaleDraft, buildSaleDraft } from './pricing';

describe('buildSaleDraft', () => {
  const catalog = [
    { id: 'p1', sku: 'A', name: 'Lapiz', price: '10.50', isActive: true },
    { id: 'p2', sku: 'B', name: 'Cuaderno', price: '2.00', isActive: true },
  ];

  it('prices the sale on the server and merges duplicate products', () => {
    const draft = buildSaleDraft(
      [
        { productId: 'p1', quantity: 2 },
        { productId: 'p1', quantity: 1 },
        { productId: 'p2', quantity: 4 },
      ],
      catalog,
    );

    expect(draft.lines).toEqual([
      expect.objectContaining({ productId: 'p1', quantity: 3, lineTotal: '31.50' }),
      expect.objectContaining({ productId: 'p2', quantity: 4, lineTotal: '8.00' }),
    ]);
    expect(draft.total).toBe('39.50');
  });

  it('ignores a client-supplied price by using the catalog price', () => {
    const draft = buildSaleDraft([{ productId: 'p2', quantity: 1 }], catalog);
    expect(draft.lines[0].unitPrice).toBe('2.00');
  });

  it('rejects an inactive or unknown product', () => {
    expect(() =>
      buildSaleDraft([{ productId: 'missing', quantity: 1 }], catalog),
    ).toThrow(InvalidSaleDraft);
  });
});
