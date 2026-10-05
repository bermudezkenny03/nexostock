# 004 · NexoStock como SaaS — Tareas

_Checklist derivada del `plan.md`._

- [x] Migración `saas_plans`: tabla `plans`, tres planes y `businesses.plan_code`.
- [x] Constantes del proveedor, planes, `platform.manage`, `SUPER_ADMIN` y roles privilegiados.
- [x] `src/bootstrap.ts` idempotente, con advisory lock y `SUPER_ADMIN` opcional.
- [x] Seed sobre el bootstrap, con tiendas demo en planes distintos.
- [x] Límite de usuarios del plan al crear y reactivar.
- [x] Regla de `platform.manage` en `RolesService`.
- [x] Catálogo sin plataforma para las tiendas.
- [x] `GET /business/me` con plan y usuarios activos.
- [x] Módulo `platform`: planes, tiendas, estado, plan y contraseña de dueño.
- [x] Campo `code` en errores.
- [x] Dockerfile y script `bootstrap`.
- [x] Auditoría persistente (`platform_audit_logs`) y `GET /api/platform/audit-logs`.
- [x] Validación de planes en el bootstrap.
- [x] Tests unitarios de las reglas y del guard de plataforma.
- [x] Tests e2e del SaaS (`test/platform.e2e-spec.ts`).
- [x] Verificar en una base vacía con `NODE_ENV=production` que el registro funciona.
- [x] README de auth-service y `.env.example`.
- [ ] Commit (cuando el equipo lo apruebe).
- [ ] Publicar una nueva imagen en Docker Hub.

## Mantenimiento

- [ ] Un plan nuevo o un cambio de límite va en una migración nueva.
- [ ] Un permiso nuevo de plataforma se agrega a `PLATFORM_PERMISSION_CODES` para que la regla de roles lo cubra.
- [ ] Toda ruta de plataforma usa `PlatformGuard` y `@RequirePermissions(Permission.PLATFORM_MANAGE)`.
