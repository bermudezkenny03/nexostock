import { http as mock, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import ProductsPage from '@/modules/products/pages/ProductsPage.vue';
import { Permission } from '@/shared/constants/permissions';
import { flushAll, mountWithApp } from '../../utils/mount';
import { API, server, useMockServer } from '../../utils/server';

useMockServer();

const product = {
  id: '00000000-0000-4000-8000-000000000101',
  sku: 'AGUA-600',
  name: 'Agua 600 ml',
  description: 'Botella de agua',
  price: '1.50',
  isActive: true,
  category: { id: 'c1', name: 'Bebidas' },
  createdAt: '2026-10-16T00:00:00.000Z',
  updatedAt: '2026-10-16T00:00:00.000Z',
};

function catalogHandlers(listSpy = vi.fn()) {
  return [
    mock.get(`${API}/products`, ({ request }) => {
      listSpy(Object.fromEntries(new URL(request.url).searchParams));
      return HttpResponse.json({ items: [product], total: 1, page: 1, pageSize: 20 });
    }),
    mock.get(`${API}/categories`, () =>
      HttpResponse.json([
        { id: 'c1', name: 'Bebidas', description: null, isActive: true, createdAt: '', updatedAt: '' },
      ]),
    ),
  ];
}

describe('ProductsPage', () => {
  it('lists products from the API without management actions for read-only roles', async () => {
    server.use(...catalogHandlers());
    const { wrapper } = await mountWithApp(ProductsPage, { permissions: [Permission.SALES_VIEW] });
    await flushAll(50);

    expect(wrapper.text()).toContain('AGUA-600');
    expect(wrapper.text()).toContain('$1.50');
    expect(wrapper.text()).toContain('Bebidas');
    expect(wrapper.text()).not.toContain('Nuevo producto');
    expect(wrapper.find('[aria-label="Editar Agua 600 ml"]').exists()).toBe(false);
  });

  it('shows management actions with products.manage', async () => {
    server.use(...catalogHandlers());
    const { wrapper } = await mountWithApp(ProductsPage, {
      permissions: [Permission.PRODUCTS_VIEW, Permission.PRODUCTS_MANAGE],
    });
    await flushAll(50);

    expect(wrapper.text()).toContain('Nuevo producto');
    expect(wrapper.find('[aria-label="Editar Agua 600 ml"]').exists()).toBe(true);
  });

  it('sends search filters to the server and never a businessId', async () => {
    const listSpy = vi.fn();
    server.use(...catalogHandlers(listSpy));
    const { wrapper } = await mountWithApp(ProductsPage, { permissions: [Permission.PRODUCTS_VIEW] });
    await flushAll(50);

    await wrapper.get('input[type="search"]').setValue('agua');
    await flushAll(400);

    expect(listSpy).toHaveBeenLastCalledWith({ search: 'agua', page: '1', pageSize: '20' });
    for (const [params] of listSpy.mock.calls) {
      expect(params).not.toHaveProperty('businessId');
    }
  });

  it('shows an error state with retry when the API fails', async () => {
    server.use(
      mock.get(`${API}/products`, () =>
        HttpResponse.json({ statusCode: 502, message: 'Bad gateway', code: 'UPSTREAM_UNAVAILABLE' }, { status: 502 }),
      ),
      mock.get(`${API}/categories`, () => HttpResponse.json([])),
    );
    const { wrapper } = await mountWithApp(ProductsPage, { permissions: [Permission.PRODUCTS_VIEW] });
    await flushAll(50);

    expect(wrapper.text()).toContain('No se pudo cargar la información');
    expect(wrapper.text()).toContain('Reintentar');
  });
});
