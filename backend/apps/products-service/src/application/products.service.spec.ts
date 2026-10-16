import { ForbiddenException } from '@nestjs/common';
import type { JwtPayload } from '@nexostock/common';
import { ProductsService } from './products.service';

const actor: JwtPayload = {
  sub: 'user-1',
  email: 'owner@shop.test',
  businessId: 'biz-1',
  roles: ['OWNER'],
  permissions: ['products.manage'],
};

describe('ProductsService', () => {
  const products = {
    countActive: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    search: jest.fn(),
    findInBusiness: jest.fn(),
  };
  const categories = { findActive: jest.fn() };
  const authClient = { status: jest.fn() };
  const inventoryClient = { ensure: jest.fn() };
  const service = new ProductsService(
    products as never,
    categories as never,
    authClient,
    inventoryClient,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('refuses to create a product when the plan cap is reached', async () => {
    authClient.status.mockResolvedValue({
      isActive: true,
      planName: 'Gratis',
      maxProducts: 50,
    });
    products.countActive.mockResolvedValue(50);

    await expect(
      service.create(actor, { sku: 'ABC', name: 'Lapiz', price: '1.50' }, 'token'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(products.create).not.toHaveBeenCalled();
  });

  it('stores the product in the token business and opens its stock', async () => {
    authClient.status.mockResolvedValue({
      isActive: true,
      planName: 'Gratis',
      maxProducts: 50,
    });
    products.countActive.mockResolvedValue(0);
    products.create.mockResolvedValue({
      id: 'prod-1',
      sku: 'ABC',
      name: 'Lapiz',
      description: null,
      price: '1.50',
      isActive: true,
      category: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    inventoryClient.ensure.mockResolvedValue(undefined);

    const created = await service.create(
      actor,
      { sku: 'abc', name: ' Lapiz ', price: '1.50', minQuantity: 3 },
      'token',
    );

    expect(products.create).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: 'biz-1',
        sku: 'ABC',
        name: 'Lapiz',
      }),
    );
    expect(inventoryClient.ensure).toHaveBeenCalledWith('prod-1', 'token', 3);
    expect(created.price).toBe('1.50');
  });

  it('removes the product if inventory cannot track it', async () => {
    authClient.status.mockResolvedValue({
      isActive: true,
      planName: 'Pro',
      maxProducts: null,
    });
    products.countActive.mockResolvedValue(0);
    products.create.mockResolvedValue({
      id: 'prod-1',
      sku: 'ABC',
      name: 'Lapiz',
      description: null,
      price: '1.50',
      isActive: true,
      category: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    inventoryClient.ensure.mockRejectedValue(new Error('down'));
    products.delete.mockResolvedValue(undefined);

    await expect(
      service.create(actor, { sku: 'ABC', name: 'Lapiz', price: '1.50' }, 'token'),
    ).rejects.toThrow('down');
    expect(products.delete).toHaveBeenCalledWith('prod-1');
  });

  it('lists only the caller business', async () => {
    products.search.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });

    await service.list('biz-1', {});

    expect(products.search).toHaveBeenCalledWith(
      expect.objectContaining({ businessId: 'biz-1', page: 1, pageSize: 20 }),
    );
  });
});
