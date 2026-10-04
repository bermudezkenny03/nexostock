# 004 · Administración de plataforma — Plan

_Cómo se implementa lo descrito en `spec.md`. Debe respetar la `constitution/` y las reglas de aislamiento de [003](../003-negocio-aislamiento/spec.md)._

## Enfoque

Todo ocurre en `auth-service` y reutiliza lo que ya existe: la tabla `businesses`, los roles y permisos, `UsersService`, `RolesService`, `BusinessService` y el registro de negocios. El equipo de NexoStock es un negocio más con el rol `SUPER_ADMIN`; lo nuevo son un permiso, una regla central y las rutas de plataforma.

## Fase A — Cimientos (implementada)

| Archivo | Cambio |
| --- | --- |
| `src/bootstrap.ts` | Nuevo. Catálogo (movido desde el seed), negocio NexoStock, roles de sistema de todos los negocios y `SUPER_ADMIN` opcional por variables de entorno. Ejecutable (`npm run bootstrap`, `node dist/bootstrap.js`) e importable |
| `src/seed.ts` | Reutiliza el bootstrap y crea las cuentas de desarrollo |
| `src/common/rbac/permission.constants.ts` | `PLATFORM_BUSINESS_ID`, `platform.manage`, `SUPER_ADMIN`, roles privilegiados y matrices de roles de tienda y de plataforma |
| `src/business/system-roles.ts` | `syncSystemRoles` recibe la matriz de roles (por defecto, la de tienda) |
| `src/roles/roles.service.ts` | Regla central: permisos de plataforma solo en roles del negocio NexoStock |
| `src/users/users.service.ts` | Las protecciones del `OWNER` cubren a todos los roles privilegiados |
| `src/catalog/*` | El módulo y el permiso de plataforma solo se listan al negocio NexoStock |
| `src/common/filters/http-exception.filter.ts` | Campo `code` opcional y constantes `ErrorCode` |
| `Dockerfile`, `package.json` | El bootstrap corre en cada arranque; script `bootstrap` |
| `test/tenancy-security.e2e-spec.ts` | Tests del `SUPER_ADMIN`, de la regla central y del bootstrap concurrente |

## Fase B — Funciones de plataforma

### B1. Servicios con negocio explícito

1. `UsersService.create/update` y `RolesService.create/update/remove` reciben `businessId` como parámetro, como ya lo hacen `findAll` y `findOne`. Los controladores de tienda pasan `actor.businessId`.
2. `RolesService.assertGrantable(permissionIds, businessId, actor)`: si `businessId` es el del actor, el límite es lo que el actor tiene; si es otro negocio (plataforma actuando sobre una tienda), el límite es `BUSINESS_PERMISSION_CODES`. La regla de `platform.manage` se mantiene antes de ese límite.
3. Correr los e2e existentes: el comportamiento de las rutas de tienda no cambia.

### B2. Guard y módulo de plataforma

1. `src/platform/platform.guard.ts`: exige `platform.manage` y `isPlatformBusiness(actor.businessId)`.
2. `src/platform/platform-actor.service.ts`: antes de cada escritura, comprueba en la base que el actor siga activo y con `platform.manage`.
3. `src/platform/platform.module.ts` con tres controladores: `platform-businesses`, `platform-users` y `platform-roles`, más el de auditoría.
4. Toda ruta con `:businessId` responde `404` si el negocio no existe o es NexoStock.

### B3. Negocios

1. Listado paginado con `$queryRaw` parametrizado si hace falta para la búsqueda por email de dueños; formato `{ items, total, page, pageSize }`.
2. `POST` reutiliza `BusinessProvisioningService.createWithOwner`.
3. `PATCH` reutiliza `BusinessService.updateProfile`.
4. `PATCH .../status`: transacción con `FOR UPDATE` sobre el negocio; al desactivar, revoca los refresh tokens de sus usuarios en un solo `UPDATE`.
5. `AuthService.login`: negocio inactivo → `403` con `ErrorCode.BUSINESS_INACTIVE`.

### B4. Usuarios y roles de cualquier negocio

Controladores finos que llaman a `UsersService` y `RolesService` con el `businessId` de la URL. Las reglas (roles privilegiados, autoedición, último privilegiado, escalada, revocación de sesiones) son las mismas porque el código es el mismo.

### B5. Auditoría

1. Migración `platform_audit_logs` (ver `spec.md`).
2. `PlatformAuditService.record(...)`: único punto de escritura; los detalles nunca incluyen contraseñas.
3. `GET /api/platform/audit-logs` paginado y filtrable por negocio.

### B6. Pruebas y documentación

1. E2E de plataforma con los criterios de la fase B.
2. Limpieza de e2e: borrar `platform_audit_logs` antes que usuarios y negocios.
3. README: rutas de plataforma, recuperación de acceso y ventana de desactivación.

## Decisiones

- **Controladores de plataforma separados, servicios compartidos.** Las rutas de tienda siguen tomando el negocio del token; las de plataforma lo toman de la URL, y solo las protege `PlatformGuard`.
- **Auditoría escrita al terminar la acción.** Pasar la transacción a través de todos los servicios complicaría el código más de lo que aporta en este MVP.
- **Sin cambios en el token.** El negocio del `SUPER_ADMIN` y su permiso bastan para reconocerlo.

## Riesgos

- **Olvidar `PlatformGuard` en un controlador nuevo:** mitigación, todos viven en `src/platform/` y el guard se aplica a nivel de clase; los e2e prueban un `403` por controlador.
- **Que el `SUPER_ADMIN` otorgue `platform.manage` a una tienda:** cubierto por la regla central y su test.
- **Ventana de 15 minutos al desactivar:** documentada; 005 puede reducirla.
- **Fallo al escribir la auditoría después de una acción:** queda en el log del servidor; aceptable para el MVP.
