import { http as mock, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import LoginPage from '@/modules/auth/pages/LoginPage.vue';
import { tokenStorage } from '@/shared/api';
import { flushAll, mountWithApp } from '../../utils/mount';
import { API, server, useMockServer } from '../../utils/server';

useMockServer();

const Blank = defineComponent({ render: () => h('div') });
const routes = [
  { path: '/login', name: 'login', component: LoginPage },
  { path: '/', name: 'home', component: Blank },
  { path: '/app/products', name: 'products', component: Blank },
];

async function fillAndSubmit(wrapper: Awaited<ReturnType<typeof mountWithApp>>['wrapper'], email: string) {
  await wrapper.get('#login-email').setValue(email);
  await wrapper.get('#login-password').setValue('Demo123!');
  await wrapper.get('form').trigger('submit');
  await flushAll(50);
}

describe('LoginPage', () => {
  it('shows field validation without calling the API', async () => {
    const { wrapper } = await mountWithApp(LoginPage, { routes, initialPath: '/login' });

    await wrapper.get('form').trigger('submit');
    await flushAll(20);

    expect(wrapper.text()).toContain('Ingresa tu correo');
    expect(wrapper.text()).toContain('Ingresa tu contraseña');
  });

  it('shows the backend error for invalid credentials', async () => {
    server.use(
      mock.post(`${API}/auth/login`, () =>
        HttpResponse.json({ statusCode: 401, message: 'Credenciales inválidas' }, { status: 401 }),
      ),
    );
    const { wrapper } = await mountWithApp(LoginPage, { routes, initialPath: '/login' });

    await fillAndSubmit(wrapper, 'ventas@donpepe.local');

    expect(wrapper.text()).toContain('Credenciales inválidas');
    expect(tokenStorage.getAccessToken()).toBeNull();
  });

  it('logs in and returns to the requested internal page', async () => {
    server.use(
      mock.post(`${API}/auth/login`, () =>
        HttpResponse.json({
          accessToken: 'a1',
          refreshToken: 'r1',
          user: {
            id: 'u1',
            email: 'ventas@donpepe.local',
            businessId: 'b1',
            businessName: 'Tienda Don Pepe',
            businessPrimaryColor: null,
            businessLogoUrl: null,
            firstName: null,
            lastName: null,
            roles: ['SALES_EMPLOYEE'],
            permissions: ['products.view'],
          },
        }),
      ),
    );
    const { wrapper, router } = await mountWithApp(LoginPage, {
      routes,
      initialPath: '/login?redirect=/app/products',
    });

    await fillAndSubmit(wrapper, 'ventas@donpepe.local');

    expect(router.currentRoute.value.fullPath).toBe('/app/products');
    tokenStorage.clear();
  });

  it('ignores external redirect targets', async () => {
    server.use(
      mock.post(`${API}/auth/login`, () =>
        HttpResponse.json({
          accessToken: 'a1',
          refreshToken: 'r1',
          user: {
            id: 'u1',
            email: 'dueno@ellapiz.local',
            businessId: 'b1',
            businessName: 'B',
            businessPrimaryColor: null,
            businessLogoUrl: null,
            firstName: null,
            lastName: null,
            roles: [],
            permissions: [],
          },
        }),
      ),
    );
    const { wrapper, router } = await mountWithApp(LoginPage, {
      routes,
      initialPath: '/login?redirect=//evil.example',
    });

    await fillAndSubmit(wrapper, 'dueno@ellapiz.local');

    expect(router.currentRoute.value.name).toBe('home');
    tokenStorage.clear();
  });
});
