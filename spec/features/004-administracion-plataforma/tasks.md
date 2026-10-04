# 004 · Administración de plataforma — Tareas

_Checklist accionable derivada del `plan.md`. Marcar `[x]` al completar._

## Fase A — Cimientos

- [x] Borrar la carpeta vacía `prisma/migrations/20261001000000_platform_super_admin`.
- [x] `src/bootstrap.ts`: catálogo, negocio NexoStock, roles de sistema y advisory lock.
- [x] `SUPER_ADMIN` opcional desde `SUPER_ADMIN_EMAIL` y `SUPER_ADMIN_PASSWORD`, sin sobrescribir cuentas.
- [x] Seed reutiliza el bootstrap y crea `superadmin@nexostock.local`.
- [x] `Dockerfile`: bootstrap en cada arranque; script `npm run bootstrap`.
- [x] Constantes: `PLATFORM_BUSINESS_ID`, `platform.manage`, `SUPER_ADMIN`, roles privilegiados.
- [x] `SUPER_ADMIN` con mínimo privilegio (administración y `platform.manage`).
- [x] Regla central: `platform.manage` solo en roles del negocio NexoStock.
- [x] Protecciones de roles privilegiados en `UsersService`.
- [x] Catálogo de plataforma visible solo para el negocio NexoStock.
- [x] Campo `code` en errores; `USER_INACTIVE`.
- [x] E2E: permisos del `SUPER_ADMIN`, regla central, catálogo y bootstrap concurrente.
- [x] Verificar en una base vacía con `NODE_ENV=production` que el registro funciona.
- [x] README de auth-service y `.env.example`.

## Fase B — Funciones de plataforma

### Servicios

- [ ] `UsersService` y `RolesService` con `businessId` explícito en create, update y remove.
- [ ] `assertGrantable` con límite según el negocio objetivo (`BUSINESS_PERMISSION_CODES` al actuar sobre una tienda).
- [ ] E2E existentes en verde sin cambios de comportamiento.

### Plataforma

- [ ] `PlatformGuard` (`platform.manage` + negocio NexoStock).
- [ ] `PlatformActorService`: actor activo en la base antes de cada escritura.
- [ ] Negocios: listado paginado, alta, detalle, edición y estado.
- [ ] Desactivar: motivo obligatorio y revocación de sesiones.
- [ ] Login de negocio inactivo → `403 BUSINESS_INACTIVE`.
- [ ] Usuarios y roles de cualquier negocio reutilizando los servicios.
- [ ] `404` para negocios inexistentes y para NexoStock en rutas de plataforma.

### Auditoría

- [ ] Migración `platform_audit_logs`.
- [ ] `PlatformAuditService.record` sin contraseñas en los detalles.
- [ ] `GET /api/platform/audit-logs`.

### Pruebas y documentación

- [ ] E2E con los criterios de la fase B.
- [ ] Limpieza de e2e con la tabla de auditoría.
- [ ] README: rutas de plataforma, recuperación de acceso y ventana de desactivación.
- [ ] Marcar criterios de la fase B en `spec.md`.

## Cierre

- [ ] Validar todos los criterios de `spec.md`.
- [ ] Mover la feature a "Hecho" en `../../constitution/roadmap.md`.

## Mantenimiento (checklist recurrente)

- [ ] Un permiso nuevo de plataforma se agrega a `PLATFORM_PERMISSION_CODES` para que la regla central lo cubra.
- [ ] Todo controlador de plataforma vive en `src/platform/` con `PlatformGuard` a nivel de clase.
- [ ] Toda acción de plataforma que cambie datos deja un registro de auditoría.
- [ ] La plataforma nunca expone productos, inventario, ventas ni reportes de las tiendas.
