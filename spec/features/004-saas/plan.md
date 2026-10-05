# 004 · NexoStock como SaaS — Plan

_Cómo se implementa lo descrito en `spec.md`._

## Enfoque

Reutilizar lo que ya existe (negocios, roles, permisos y servicios) y agregar solo lo indispensable: una tabla de planes, un rol y un permiso de plataforma, y un módulo con las rutas del panel.

## Implementación

| Archivo | Cambio |
| --- | --- |
| `prisma/migrations/20261004000000_saas_plans` | Tabla `plans` con los tres planes y `businesses.plan_code` (por defecto `FREE`) |
| `src/common/rbac/permission.constants.ts` | Negocio NexoStock, códigos de plan, `platform.manage`, `SUPER_ADMIN`, roles privilegiados y matrices de roles |
| `src/bootstrap.ts` | Nuevo: catálogo (sacado del seed), negocio NexoStock, roles de sistema y `SUPER_ADMIN` opcional |
| `src/seed.ts` | Reutiliza el bootstrap; tiendas demo en planes distintos |
| `src/business/system-roles.ts` | Recibe la matriz de roles (por defecto, la de tienda) |
| `src/users/users.service.ts` | Límite del plan al crear y reactivar; protecciones de roles privilegiados |
| `src/roles/roles.service.ts` | `platform.manage` solo en roles del negocio NexoStock |
| `src/catalog/*` | La plataforma solo se lista al equipo de NexoStock |
| `src/business/*` | `GET /business/me` con `plan` y `activeUsers` |
| `src/platform/*` | Nuevo módulo: guard, controlador, servicio, DTOs y entidades del panel |
| `src/common/filters/http-exception.filter.ts` | Campo `code` y constantes `ErrorCode` |
| `Dockerfile`, `package.json` | Bootstrap en cada arranque, `CHECKPOINT_DISABLE`, margen del healthcheck y script `bootstrap` |
| `prisma/migrations/20261004010000_platform_audit_logs` | Tabla `platform_audit_logs` con la acción como enum |
| `src/common/rbac/permission.constants.spec.ts`, `src/platform/platform.guard.spec.ts` | Nuevos: tests unitarios de las reglas |
| `test/platform.e2e-spec.ts` | Nuevo: tests e2e del SaaS |

## Decisiones

- **Planes como datos de migración:** una sola fuente de verdad; cambiar un límite es una migración, no una edición manual.
- **El proveedor es un negocio más:** reutiliza login, sesiones y administración de equipo, sin volver opcional `business_id`.
- **Un solo permiso de plataforma:** alcanza para el MVP.
- **Auditoría en la misma transacción que la acción:** nunca queda una acción sin registro ni un registro sin acción.
- **El bootstrap valida los planes:** un plan sin permisos configurados detiene el arranque en vez de caer en Gratis sin aviso.
- **Bajar de plan no desactiva usuarios:** evita dejar a una tienda sin acceso por un cambio administrativo.

## Riesgos

- **Ventana de 15 minutos al desactivar una tienda:** documentada; el gateway podría reducirla más adelante.
- **El límite de productos aún no se aplica:** depende de `products-service`.
