import { http as mock, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import RegisterPage from '@/modules/auth/pages/RegisterPage.vue';
import { tokenStorage } from '@/shared/api';
import { flushAll, mountWithApp } from '../../utils/mount';
import { API, server, useMockServer } from '../../utils/server';

useMockServer();

const Blank = defineComponent({ render: () => h('div') });
const routes = [
  { path: '/register', name: 'register', component: RegisterPage },
  { path: '/login', name: 'login', component: Blank },
  { path: '/', name: 'home', component: Blank },
  { path: '/app/plan', name: 'business-plan', component: Blank },
];

const user = {
  id: 'u1',
  email: 'ana@laesquina.com',
  businessId: 'b1',
  businessName: 'Papelería La Esquina',
  businessPrimaryColor: null,
  businessLogoUrl: null,
  firstName: 'Ana',
  lastName: 'Pérez',
  roles: ['OWNER'],
  permissions: ['dashboard.view'],
};

describe('RegisterPage', () => {
  beforeEach(() => {
    server.use(mock.get(`${API}/auth/plans`, () => new HttpResponse(null, { status: 404 })));
  });

  it('creates the business through POST /auth/register and does not send a plan', async () => {
    const bodySpy = vi.fn();
    server.use(
      mock.post(`${API}/auth/register`, async ({ request }) => {
        bodySpy(await request.json());
        return HttpResponse.json({ accessToken: 'a1', refreshToken: 'r1', user });
      }),
    );
    const { wrapper, router } = await mountWithApp(RegisterPage, { routes, initialPath: '/register' });

    expect(wrapper.text()).toContain('Gratis');
    expect(wrapper.text()).toContain('Básico');
    expect(wrapper.text()).toContain('Pro');

    const free = wrapper.findAll('article').find((article) => article.text().includes('Gratis'));
    await free!.get('button').trigger('click');
    await wrapper.get('#register-business').setValue('Papelería La Esquina');
    await wrapper.get('#register-first').setValue('Ana');
    await wrapper.get('#register-last').setValue('Pérez');
    await wrapper.get('#register-email').setValue('ana@laesquina.com');
    await wrapper.get('#register-password').setValue('SecurePass1');
    await wrapper.get('#register-confirm').setValue('SecurePass1');
    await wrapper.get('form').trigger('submit');
    await flushAll(50);

    expect(bodySpy).toHaveBeenCalledWith({
      businessName: 'Papelería La Esquina',
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'ana@laesquina.com',
      password: 'SecurePass1',
    });
    expect(router.currentRoute.value.name).toBe('home');
    tokenStorage.clear();
  });

  it('simulates payment for a paid plan and still registers without a plan or card', async () => {
    const bodySpy = vi.fn();
    server.use(
      mock.post(`${API}/auth/register`, async ({ request }) => {
        bodySpy(await request.json());
        return HttpResponse.json({ accessToken: 'a1', refreshToken: 'r1', user });
      }),
    );
    const { wrapper, router } = await mountWithApp(RegisterPage, { routes, initialPath: '/register' });
    const basic = wrapper.findAll('article').find((article) => article.text().includes('Básico'));
    await basic!.get('button').trigger('click');

    expect(wrapper.text()).toContain('Tarjeta de prueba');
    expect((wrapper.get('#sim-number').element as HTMLInputElement).value).toBe('4242 4242 4242 4242');

    await wrapper.get('#register-business').setValue('Papelería La Esquina');
    await wrapper.get('#register-first').setValue('Ana');
    await wrapper.get('#register-last').setValue('Pérez');
    await wrapper.get('#register-email').setValue('ana@laesquina.com');
    await wrapper.get('#register-password').setValue('SecurePass1');
    await wrapper.get('#register-confirm').setValue('SecurePass1');
    await wrapper.get('form').trigger('submit');
    await flushAll(50);

    expect(bodySpy).toHaveBeenCalledWith({
      businessName: 'Papelería La Esquina',
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'ana@laesquina.com',
      password: 'SecurePass1',
    });
    expect(router.currentRoute.value.name).toBe('business-plan');
    expect(router.currentRoute.value.query.simulado).toBe('BASIC');
    tokenStorage.clear();
  });

  it('assigns the chosen plan when the catalog is live and never sends the card', async () => {
    const bodySpy = vi.fn();
    server.use(
      mock.get(`${API}/auth/plans`, () =>
        HttpResponse.json([
          { code: 'FREE', name: 'Gratis', description: 'Para empezar.', maxUsers: 2, maxProducts: 50, monthlyPrice: '0' },
          { code: 'BASIC', name: 'Básico vivo', description: 'Equipo.', maxUsers: 5, maxProducts: 500, monthlyPrice: '199.00' },
          { code: 'PRO', name: 'Pro', description: 'Sin límites.', maxUsers: null, maxProducts: null, monthlyPrice: null },
        ]),
      ),
      mock.post(`${API}/auth/register`, async ({ request }) => {
        bodySpy(await request.json());
        return HttpResponse.json({ accessToken: 'a1', refreshToken: 'r1', user });
      }),
    );
    const { wrapper, router } = await mountWithApp(RegisterPage, { routes, initialPath: '/register' });
    await flushAll(50);
    expect(wrapper.text()).toContain('Básico vivo');

    const basic = wrapper.findAll('article').find((article) => article.text().includes('Básico vivo'));
    await basic!.get('button').trigger('click');
    await wrapper.get('#register-business').setValue('Papelería La Esquina');
    await wrapper.get('#register-first').setValue('Ana');
    await wrapper.get('#register-last').setValue('Pérez');
    await wrapper.get('#register-email').setValue('ana@laesquina.com');
    await wrapper.get('#register-password').setValue('SecurePass1');
    await wrapper.get('#register-confirm').setValue('SecurePass1');
    await wrapper.get('form').trigger('submit');
    await flushAll(50);

    expect(bodySpy).toHaveBeenCalledWith({
      businessName: 'Papelería La Esquina',
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'ana@laesquina.com',
      password: 'SecurePass1',
      planCode: 'BASIC',
    });
    expect(JSON.stringify(bodySpy.mock.calls[0]?.[0])).not.toContain('4242');
    expect(router.currentRoute.value.name).toBe('business-plan');
    expect(router.currentRoute.value.query.asignado).toBe('BASIC');
    expect(router.currentRoute.value.query.simulado).toBeUndefined();
    tokenStorage.clear();
  });

  it('shows the backend message when the email is already registered', async () => {
    server.use(
      mock.post(`${API}/auth/register`, () =>
        HttpResponse.json({ statusCode: 409, message: 'El email ya está registrado' }, { status: 409 }),
      ),
    );
    const { wrapper } = await mountWithApp(RegisterPage, { routes, initialPath: '/register' });
    const freePlan = wrapper.findAll('article').find((article) => article.text().includes('Gratis'));
    await freePlan!.get('button').trigger('click');

    await wrapper.get('#register-business').setValue('Papelería La Esquina');
    await wrapper.get('#register-first').setValue('Ana');
    await wrapper.get('#register-last').setValue('Pérez');
    await wrapper.get('#register-email').setValue('ana@laesquina.com');
    await wrapper.get('#register-password').setValue('SecurePass1');
    await wrapper.get('#register-confirm').setValue('SecurePass1');
    await wrapper.get('form').trigger('submit');
    await flushAll(50);

    expect(wrapper.text()).toContain('El email ya está registrado');
    expect(tokenStorage.getAccessToken()).toBeNull();
  });
});
