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
  app/       arranque, router, providers, layout de Sakai Vue (AppLayout, Topbar, Menu, Configurator)
  assets/    SCSS original de Sakai (sakai-assets) + Tailwind de la plantilla
  shared/    api (httpClient, errores, tokens), ui (App* sobre PrimeVue/Sakai), composables
  modules/   auth, dashboard, products, inventory, sales, reports, users, businesses, platform
             cada módulo expone rutas y menú desde su index.ts
tests/       unit (Vitest), e2e (Playwright), utils (MSW, mount)
```

La base visual es [Sakai Vue 5](https://github.com/primefaces/sakai-vue) (MIT, PrimeTek). Los estilos de `src/assets/sakai` se copian sin modificar; la marca NexoStock solo cambia nombre, logo de producto y el modelo de menú filtrado por permisos.

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
| E–F. Inventario, ventas, reportes, usuarios, roles, plataforma | Completada (capa visual Sakai + APIs reales). |

## Qué está conectado de verdad

Todo lo siguiente usa el gateway real; no hay mocks en la aplicación (MSW solo en tests):

- Login, registro público (`POST /auth/register` con `planCode` opcional; sin él queda en FREE), catálogo público `GET /auth/plans`, refresh, `me`, logout, logout-all y cambio de contraseña. La tarjeta del registro no se envía.
- Dashboard: `GET /business/me`, `GET /reports/overview`, `GET /reports/low-stock`, `GET /reports/sales`, `GET /reports/top-products` y `GET /sales` si el rol lo permite. Sin cifras inventadas: si no hay ventas, los widgets quedan vacíos.
- Productos: listado paginado con búsqueda y filtros, alta, edición, activar/desactivar; `minQuantity` leído de `GET /inventory/stock/:id`.
- Categorías: listado, alta, edición, activar/desactivar.
- Inventario: `GET /inventory/stock`, `PATCH` mínimo, `GET /inventory/movements` y `POST /inventory/movements`.
- Ventas: `GET /sales`, alta y cancelación.
- Reportes: mismos endpoints del dashboard, con filtro de fechas.
- Usuarios y roles: `GET/POST/PATCH /users`, `GET/POST/PATCH/DELETE /roles`, `GET /permissions`.
- Plataforma: `GET /platform/businesses`, cambio de plan y estado, `GET /platform/plans` y `PATCH /platform/plans/:code` (nombre, descripción, límites y precio mensual).
- Plan del negocio: `GET /business/me` en `/app/plan`. Quien administra el negocio puede pedir otro plan (`POST /business/me/plan-request`); la plataforma lo confirma en el resumen. El visitante ve el catálogo en `/register`.

Brechas del backend y propuestas: [docs/backend-dependencies.md](docs/backend-dependencies.md).

## Verificación

`lint`, `typecheck`, 57 tests unitarios, 4 tests E2E contra el backend real y `build` en verde (sin chunks > 500 kB).
