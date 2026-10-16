import { expect, test, type Page } from '@playwright/test';

/**
 * Runs against the real gateway (`docker compose up`) with the seed users.
 * Skipped when the gateway is not reachable so CI without backend stays green.
 */
const GATEWAY = process.env.E2E_API_URL ?? 'http://localhost:3000/api';

test.beforeAll(async ({ request }) => {
  const reachable = await request
    .get(`${GATEWAY}/health`, { timeout: 10_000 })
    .then((response) => response.ok())
    .catch(() => false);
  test.skip(!reachable, `Gateway no disponible en ${GATEWAY}`);
});

/** Login hashes with bcrypt inside the containers, which can be slow on a loaded dev machine. */
const AFTER_LOGIN = { timeout: 45_000 };

async function login(page: Page, email: string, password: string, { navigate = true } = {}): Promise<void> {
  if (navigate) {
    await page.goto('/login');
  }
  await page.getByLabel('Correo electrónico').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
}

test('owner signs in, browses products and signs out', async ({ page }) => {
  await page.goto('/app/products');
  await expect(page).toHaveURL(/\/login\?redirect=/);

  await login(page, 'admin@nexostock.local', 'Admin123!', { navigate: false });

  await expect(page).toHaveURL(/\/app\/products$/, AFTER_LOGIN);
  await expect(page.getByRole('heading', { name: 'Productos' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nuevo producto' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Productos' })).toBeVisible();

  await page.getByRole('button', { name: /Menú de usuario/ }).click();
  await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login/);
  expect(await page.evaluate(() => sessionStorage.getItem('nexostock.session.refresh'))).toBeNull();
});

test('sales employee sees the catalog read-only', async ({ page }) => {
  await login(page, 'ventas@donpepe.local', 'Demo123!');
  await expect(page).toHaveURL(/\/app$/, AFTER_LOGIN);

  await page.goto('/app/products');
  await expect(page.getByRole('heading', { name: 'Productos' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nuevo producto' })).toHaveCount(0);
});

test('platform admin lands on the platform panel and cannot open the business panel', async ({ page }) => {
  await login(page, 'superadmin@nexostock.local', 'SuperAdmin123!');
  await expect(page).toHaveURL(/\/platform$/, AFTER_LOGIN);

  await page.goto('/app/products');
  await expect(page).toHaveURL(/\/platform$/);
});

test('invalid credentials show the backend message', async ({ page }) => {
  await login(page, 'admin@nexostock.local', 'incorrecta-1');
  await expect(page.getByText('Credenciales inválidas')).toBeVisible(AFTER_LOGIN);
  await expect(page).toHaveURL(/\/login/);
});
