# 003 · Aislamiento por Negocio — Tareas

_Checklist accionable derivada del `plan.md`. Fase 1: solo ítems de documentación. Fase 2: marcar `[x]` al completar._

## Fase 1 — MVP (documentación y diseño)

- [x] Redactar `spec.md` con fases 1–3, terminología y decisiones.
- [x] Redactar `plan.md` y `tasks.md` para activación v2.
- [x] Enlazar desde `constitution/tech-stack.md` (sección 4).
- [x] Revisar con el equipo que features de productos/inventario/ventas mencionen `businessId` en sus specs antes de persistir datos (ver [002](../002-productos-catalogo/spec.md); inventario/ventas: convención en 002 hasta spec propia).
- [ ] Confirmar en roadmap que v2 multi-negocio queda en backlog hasta criterio de negocio (segundo cliente u hosting compartido).

## Fase 2 — Auth (`businessId` y JWT)

- [x] Añadir modelo `Business` y relaciones en `schema.prisma`.
- [x] Migración: `businesses`, `users.business_id`, `roles.business_id`, unique compuesto en roles (`20251001000000_init_auth`).
- [x] Script de backfill: negocio por defecto + remapeo de `user_roles`.
- [x] Actualizar seed: catálogo global + tres roles de sistema por negocio según la matriz de 001 (`OWNER`, `INVENTORY_ADMIN`, `SALES_EMPLOYEE`). Un rol por usuario.
- [x] Filtrar CRUD de usuarios y roles por `businessId` del token.
- [x] Extender `JwtPayload` y firma de access token con `businessId`.
- [x] Exponer `businessId` en login, refresh y perfil (`businessName` incluido).
- [x] Bloquear login si el negocio está inactivo.
- [x] Pruebas e2e: aislamiento entre dos negocios en auth.
- [x] Identidad visual: `primary_color` y `logo_url` en `businesses`, `PATCH /api/business/me`, y login/`me`.
- [x] `user_roles.business_id` con FKs compuestas a usuario y rol del mismo negocio.
- [x] `users` y `roles` hacia `businesses` con `ON DELETE RESTRICT`; `refresh_tokens.token_hash` UNIQUE; índice `users(business_id)`.
- [x] Documentar la desactivación de negocios como pendiente (hace falta administrador de plataforma).
- [x] Registro self-service de negocios: `POST /api/auth/register` crea negocio, roles de sistema y `OWNER` en una transacción.
- [x] Permiso `business.manage` (módulo `admin-business`) para `PATCH /api/business/me`.
- [x] Seguridad de sesión: refresh de un solo uso con rotación atómica y detección de reutilización; `logout-all`; `change-password`; login con tiempo constante.
- [x] Protección del `OWNER` y prevención de escalada de permisos en usuarios y roles.
- [x] Esquema: UUID nativos, `timestamptz`, `CHECK` de integridad, `user_roles` con PK `user_id` y `RESTRICT` hacia roles.
- [x] Guards globales (`@Public()`), `@CurrentUser()`, filtro de errores Prisma → 409/404, `helmet`.
- [x] Pruebas e2e de registro, sesiones, protección del propietario, escalada, borrado de roles y validación de `null`.

## Fase 2 — API Gateway

- [ ] Exigir claim `businessId` en rutas protegidas post-v2.
- [ ] Propagar contexto verificado a servicios internos.
- [ ] Documentar contrato en README del gateway.

## Fase 2 — Servicios operativos

- [ ] `products-service`: columna `business_id`, índices, filtros en todas las consultas.
- [ ] `inventory-service`: idem + validación de producto por negocio.
- [ ] `sales-service`: idem + coordinación con inventario con mismo `businessId`.
- [ ] `reports-service`: agregaciones filtradas por negocio.
- [ ] Pruebas por servicio: recurso de otro negocio no accesible.

## Fase 2 — Frontend

- [ ] Persistir `businessId` (y nombre del negocio) en estado de sesión.
- [ ] Copy “Negocio” en UI donde aplique.
- [ ] Verificar que no se envía `businessId` manual en APIs.

## Fase 2 — Migración y cierre

- [x] Probar migración desde base fase 1 en entorno limpio (auth-service local).
- [x] Plan de re-login comunicado para despliegue (`backend/auth-service/README.md`).
- [ ] Validar todos los criterios de aceptación de `spec.md` (sección fase 2).
- [ ] Actualizar `../../constitution/roadmap.md` al cerrar v2.

## Fase 3 — Backlog (opcional)

- [ ] Spec separada para `business_user` M:N y selector de negocio activo.
- [ ] Spec separada para superadministrador de plataforma.
- [x] Onboarding de nuevos negocios sin intervención manual (adelantado a fase 2 con `POST /api/auth/register`).

## Mantenimiento (checklist recurrente)

- [ ] Al añadir tabla operativa nueva, incluir `business_id` NOT NULL e índice desde el primer migration.
- [ ] Al añadir endpoint, revisar filtro por `businessId` del JWT en code review.
- [ ] Al cambiar catálogo de permisos globales, verificar impacto en seeds de roles **por negocio**.
