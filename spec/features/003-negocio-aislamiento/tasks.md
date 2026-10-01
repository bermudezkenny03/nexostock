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
- [x] Actualizar seed: catálogo global + roles por negocio.
- [x] Filtrar CRUD de usuarios y roles por `businessId` del token.
- [x] Extender `JwtPayload` y firma de access token con `businessId`.
- [x] Exponer `businessId` en login, refresh y perfil (`businessName` incluido).
- [x] Bloquear login si el negocio está inactivo.
- [x] Pruebas e2e: aislamiento entre dos negocios en auth.

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
- [ ] Evaluar onboarding de nuevos negocios sin intervención manual.

## Mantenimiento (checklist recurrente)

- [ ] Al añadir tabla operativa nueva, incluir `business_id` NOT NULL e índice desde el primer migration.
- [ ] Al añadir endpoint, revisar filtro por `businessId` del JWT en code review.
- [ ] Al cambiar catálogo de permisos globales, verificar impacto en seeds de roles **por negocio**.
