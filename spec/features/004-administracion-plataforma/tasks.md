# 004 · Administración de plataforma — Tareas

_Checklist accionable derivada del `plan.md`. Marcar `[x]` al completar._

## Preparación

- [ ] Borrar la carpeta vacía `prisma/migrations/20261001000000_platform_super_admin`.
- [ ] Confirmar e2e en verde sobre la base local antes de empezar.

## Fase A — Cimientos

### Bootstrap y seed

- [ ] Mover `MODULE_TREE` a `src/bootstrap/catalog.definition.ts` con `scope` por módulo y el módulo `platform` / `platform-businesses`.
- [ ] `syncCatalog(db)` con `scope` copiado del módulo a sus permisos y validación padre/hijo.
- [ ] `ensurePlatformBusiness(db)` con `PLATFORM_BUSINESS_ID` fijo.
- [ ] `src/bootstrap.ts` con advisory lock: catálogo → negocio de plataforma → roles de sistema de todos los negocios.
- [ ] `src/seed.ts` reutiliza el bootstrap y crea `platform@nexostock.local` además del negocio demo.
- [ ] `src/cli/create-platform-admin.ts` leyendo credenciales de variables de entorno.
- [ ] Scripts `bootstrap` y `platform:create-admin`; ambos compilan a `dist/`.
- [ ] `Dockerfile`: el bootstrap corre en cada arranque; el seed solo con `RUN_SEED=true`.

### Permisos y roles

- [ ] Constantes de módulos, permisos y rol de plataforma.
- [ ] `ALL_PERMISSION_CODES` → `BUSINESS_PERMISSION_CODES` + `PLATFORM_PERMISSION_CODES`.
- [ ] Matrices `BUSINESS_ROLE_PERMISSIONS` y `PLATFORM_ROLE_PERMISSIONS`.
- [ ] `syncSystemRoles(db, businessId, scope)` guarda `scope` en roles y `role_permissions`.
- [ ] Test unitario: las listas no se cruzan y los códigos de plataforma empiezan por `platform.`.

### Migración A

- [ ] Enum `access_scope`.
- [ ] `businesses.scope`, `UNIQUE (id, scope)` e índice único parcial de plataforma.
- [ ] `scope` en `modules`, `permissions`, `roles` y `role_permissions` con relleno `BUSINESS`.
- [ ] FKs compuestas que reemplazan las simples en `permissions` y `roles`; FKs compuestas nuevas en `role_permissions`.
- [ ] Quitar los `DEFAULT` temporales de `scope`.
- [ ] `schema.prisma` con enum y relaciones compuestas.
- [ ] Probar la migración sobre una copia de la base local con datos.

### Token y guards

- [ ] `accessScope` obligatorio en `JwtPayload` y `parseJwtPayload`.
- [ ] `AccessService` y `TokenService` emiten `accessScope` desde `business.scope`.
- [ ] Decoradores `@AllowedScopes`, `@PlatformOnly`, `@AnyScope`.
- [ ] `ScopeGuard` global entre `JwtAuthGuard` y `PermissionsGuard`, `BUSINESS` por defecto.
- [ ] `@AnyScope()` en `GET /auth/me`, `change-password` y `logout-all`.
- [ ] Catálogo filtrado por `scope: BUSINESS`.
- [ ] Roles creados o editados guardan `scope` en el rol y en sus permisos.
- [ ] Registro de negocios usa `syncSystemRoles(..., BUSINESS)`.

### Errores

- [ ] `code` opcional en `ErrorShape` y en `HttpExceptionFilter`.
- [ ] Constantes de códigos de error.
- [ ] `USER_INACTIVE` en el login.

### Pruebas y documentación (fase A)

- [ ] E2E `platform-scope.e2e-spec.ts` con los criterios de la fase A.
- [ ] E2E: `role_permissions` con ámbitos mezclados falla en la base (en ambos sentidos).
- [ ] Ajustar e2e existentes que dependen del catálogo completo o de `ALL_PERMISSION_CODES`.
- [ ] README de auth-service: bootstrap, seed, `platform:create-admin`, `accessScope`, `code`.
- [ ] Marcar los criterios de la fase A en `spec.md`.

## Fase B — Funciones de plataforma

### Migración B

- [ ] Enum `business_status`; `businesses.status` rellenado desde `is_active`; quitar `is_active`.
- [ ] `CHECK` que impide suspender el negocio de plataforma.
- [ ] Enum `platform_action`.
- [ ] Tabla `password_reset_tokens` con `CHECK`, hash único e índice único parcial por usuario.
- [ ] Tabla `platform_audit_events` con `CHECK` e índice `(business_id, created_at DESC)`.

### Estado del negocio

- [ ] `AccessService` usa `status === 'ACTIVE'`.
- [ ] Login de negocio suspendido → `403 BUSINESS_SUSPENDED`.
- [ ] `BusinessProfileEntity`: `isActive` → `status`.
- [ ] Actualizar tests que usan `isActive` sobre negocios.

### Endpoints de plataforma

- [ ] Módulo `platform` con controlador `@PlatformOnly()`.
- [ ] `PlatformActorService`: actor activo en la base antes de cada acción.
- [ ] `PlatformAuditService.record(tx, event)`.
- [ ] `GET /api/platform/businesses` paginado, con búsqueda y filtro, sin el negocio de plataforma.
- [ ] `GET /api/platform/businesses/:id` con dueños y últimos 20 eventos.
- [ ] `POST .../suspend` y `POST .../reactivate` transaccionales, con revocación de sesiones, auditoría y `409` al repetir.
- [ ] `PageEntity<T>` con `{ items, total, page, pageSize }`.

### Recuperación de acceso

- [ ] `POST .../owners/:userId/reset-link` solo para `OWNER` activo; invalida el enlace anterior; `Cache-Control: no-store`.
- [ ] `POST /api/auth/password-reset` público, consumo atómico, revoca sesiones, `RESET_LINK_INVALID` para cualquier fallo.
- [ ] Throttle de 5 intentos por 15 minutos.
- [ ] `PASSWORD_RESET_TTL` en config, `.env.example` y `docker-compose.yml`.

### Pruebas y documentación (fase B)

- [ ] E2E `platform-operations.e2e-spec.ts` con los criterios de la fase B.
- [ ] E2E de concurrencia: dos usos simultáneos del mismo enlace, solo uno pasa.
- [ ] Limpieza de e2e: borrar auditoría y enlaces antes que usuarios y negocios.
- [ ] README: rutas de plataforma, procedimiento de entrega de enlaces y ventana de suspensión.
- [ ] Marcar los criterios de la fase B en `spec.md`.

## Cierre

- [ ] Validar todos los criterios de aceptación de `spec.md`.
- [ ] Mover la feature a "Hecho" en `../../constitution/roadmap.md`.

## Mantenimiento (checklist recurrente)

- [ ] Al agregar un módulo o permiso, indicar su `scope` en `catalog.definition.ts`; un permiso de tienda nunca va bajo `platform`.
- [ ] Al agregar una ruta, decidir su ámbito: sin decorador queda solo para `BUSINESS`.
- [ ] Al agregar una acción de plataforma, registrar su evento en la misma transacción y sumar el valor a `platform_action`.
- [ ] No exponer en la plataforma datos operativos ni datos personales de empleados.
