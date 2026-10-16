# NexoStock Frontend

Panel web de NexoStock (SaaS multi-tenant de inventarios y ventas). Vue 3, TypeScript strict, Vite, PrimeVue 4 y TanStack Query. Consume **solo** el API Gateway.

## Requisitos e instalación

- Node 22+ y npm.
- Backend levantado: `docker compose up -d` en la raíz del repositorio (gateway en `http://localhost:3000/api`).

```bash
cd frontend
cp .env.example .env        # VITE_API_BASE_URL=http://localhost:3000/api
npm install
npm run dev                 # http://localhost:5173
```

| Script | Uso |
|--------|-----|
| `npm run dev` | Servidor de desarrollo. |
| `npm run lint` | ESLint (incluye reglas de fronteras entre capas). |
| `npm run typecheck` | `vue-tsc --build`. |
| `npm test` | Vitest + Vue Test Utils + MSW (sin backend). |
| `npm run test:e2e` | Playwright contra el backend real. Se omite si el gateway no responde. Requiere `npx playwright install chromium`. |
| `npm run build` | Typecheck + build de producción. |
| `npm run api:types` | Regenera `src/shared/api/generated/auth.ts` desde el auth-service (`:3001`). |

Usuarios de seed: `admin@nexostock.local` / `Admin123!` (OWNER, PRO), `ventas@donpepe.local` / `Demo123!` (SALES_EMPLOYEE, FREE), `superadmin@nexostock.local` / `SuperAdmin123!` (plataforma).

## Arquitectura

```text
src/
  app/       arranque, router y guards, layouts, providers (PrimeVue, sesión)
  shared/    api (httpClient, errores, tokens), ui (App*), composables, constants, styles
  modules/   auth, dashboard, products, inventory, reports, businesses, platform
             cada módulo expone rutas y menú desde su index.ts
tests/       unit (Vitest), e2e (Playwright), utils (MSW, mount)
```

ESLint impide que `shared/` importe `modules/` o `app/`, y que un módulo importe internos de otro.

### Sesión y seguridad

- `accessToken` solo en memoria; `refreshToken` en `sessionStorage`.
- Un 401 dispara un refresh **single-flight**; cada petición se reintenta una vez. Si falla, se cierra la sesión y se vuelve a `/login?reason=expired&redirect=…`.
- `403 BUSINESS_SUSPENDED` cierra la sesión con aviso; otros 403 muestran "sin permiso" sin cerrarla.
- Pestañas duplicadas se detectan con `BroadcastChannel` para no reutilizar un refresh ya rotado.
- Menús, rutas y botones se filtran por permisos (semántica OR), pero **la autorización la decide el backend**. El `businessId` sale siempre del JWT; nunca se envía desde la UI.

## Progreso

| Etapa | Estado |
|-------|--------|
| A. Diagnóstico | Completada. |
| B. Fundación (tema, layout, componentes, httpClient) | Completada. |
| C. Autenticación, rutas, guards, tests | Completada. |
| D. Productos y categorías | Completada. |
| E–F. Inventario, ventas, reportes, usuarios, roles, plataforma | Pendiente. |

## Qué está conectado de verdad

Todo lo siguiente usa el gateway real; no hay mocks en la aplicación (MSW solo en tests):

- Login, refresh, `me`, logout, logout-all y cambio de contraseña.
- Dashboard: `GET /business/me` (plan y límites), `GET /reports/overview` y `GET /reports/low-stock` si el rol tiene `reports.view`.
- Productos: listado paginado con búsqueda y filtros, alta, edición, activar/desactivar; `minQuantity` leído de `GET /inventory/stock/:id`.
- Categorías: listado, alta, edición, activar/desactivar.
- Plataforma: `GET /platform/businesses` y `GET /platform/plans`.

Brechas del backend y propuestas: [docs/backend-dependencies.md](docs/backend-dependencies.md).

## Verificación

`lint`, `typecheck`, 57 tests unitarios, 4 tests E2E contra el backend real y `build` en verde (sin chunks > 500 kB).
