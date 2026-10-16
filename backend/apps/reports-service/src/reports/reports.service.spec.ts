import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const clients = {
    productSummary: jest.fn(),
    stockSummary: jest.fn(),
    salesSummary: jest.fn(),
    stockAlerts: jest.fn(),
    quote: jest.fn(),
    salesSeries: jest.fn(),
    topProducts: jest.fn(),
  };
  const service = new ReportsService(clients as never);

  beforeEach(() => jest.resetAllMocks());

  it('builds the overview from catalog, stock and confirmed sales', async () => {
    clients.productSummary.mockResolvedValue({ active: 4, total: 5 });
    clients.stockSummary.mockResolvedValue({ skuCount: 4, units: 20, lowStock: 1 });
    clients.salesSummary.mockResolvedValue({ count: 2, total: '30.00' });

    await expect(service.overview('token', {})).resolves.toEqual({
      products: { active: 4, total: 5 },
      inventory: { skuCount: 4, units: 20, lowStock: 1 },
      sales: { count: 2, total: '30.00' },
    });
  });

  it('attaches the product name to low-stock alerts', async () => {
    clients.stockAlerts.mockResolvedValue([
      { productId: 'p1', quantity: 1, minQuantity: 5, updatedAt: '2026-01-01' },
    ]);
    clients.quote.mockResolvedValue([
      { id: 'p1', sku: 'A', name: 'Lapiz', price: '1.00', isActive: true },
    ]);

    await expect(service.lowStock('token')).resolves.toEqual([
      expect.objectContaining({ productId: 'p1', sku: 'A', name: 'Lapiz', quantity: 1 }),
    ]);
  });
});
