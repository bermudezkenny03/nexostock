# 004 · Administración de plataforma — Plan

_Cómo se implementa lo descrito en `spec.md`. Debe respetar la `constitution/` y las reglas de aislamiento de [003](../003-negocio-aislamiento/spec.md)._

## Enfoque

Todo ocurre en `auth-service`, en dos fases que se pueden entregar por separado:

- **Fase A — Cimientos:** separa bootstrap y seed, introduce el ámbito (`scope`) en la base con FKs compuestas, crea el negocio y el rol de plataforma, agrega el claim `accessScope` con su guard global y el campo `code` en los errores. Fija el contrato que necesitan [005](../005-api-gateway-comunicacion/spec.md) y los servicios operativos.
- **Fase B — Funciones de plataforma:** estado del negocio, auditoría, enlaces de recuperación y los endpoints `/api/platform/*`.

Cada fase tiene su propia migración. Nunca se edita `20251001000000_init_auth`.

## Precondiciones

- Borrar la carpeta vacía `prisma/migrations/20261001000000_platform_super_admin`. Git no la registra (no tiene archivos) y Prisma no debe encontrar migraciones sin `migration.sql`.
- Base local con las migraciones actuales aplicadas y los e2e en verde antes de empezar.

## Implementación — Fase A

### A1. Bootstrap separado del seed

1. `src/bootstrap/catalog.definition.ts` — mover `MODULE_TREE` desde `src/seed.ts`, agregar `scope` a cada módulo y sumar el módulo raíz `platform` con su hijo `platform-businesses` (`scope: PLATFORM`).
2. `src/bootstrap/catalog.ts` — `syncCatalog(db)`: upsert de módulos y permisos, con el `scope` del módulo copiado a cada permiso. Validar que un hijo tenga el mismo `scope` que su padre (lo garantiza el código, no la base).
3. `src/bootstrap/platform.ts` — `ensurePlatformBusiness(db)`: upsert del negocio `NexoStock Plataforma` con un UUID fijo (`PLATFORM_BUSINESS_ID`) y `scope: PLATFORM`.
4. `src/bootstrap.ts` — punto de entrada seguro para producción, en una transacción con `pg_advisory_xact_lock`: `syncCatalog` → `ensurePlatformBusiness` → `syncSystemRoles` para cada negocio según su `scope`. No crea usuarios.
5. `src/seed.ts` — llama al bootstrap y luego crea el negocio demo, `admin@nexostock.local` y `platform@nexostock.local` (`Platform123!`). Sigue negándose a correr en producción.
6. `src/cli/create-platform-admin.ts` — lee `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD`, `PLATFORM_ADMIN_FIRST_NAME` y `PLATFORM_ADMIN_LAST_NAME`; valida la contraseña con la misma política del registro; crea el usuario con rol `PLATFORM_ADMIN`; falla si el email ya existe.
7. `package.json` — scripts `bootstrap` y `platform:create-admin`; `nest-cli.json`/`tsconfig.build.json` para que ambos se compilen a `dist/`.
8. `Dockerfile` — `CMD`: `prisma migrate deploy && node dist/bootstrap.js && (seed solo si RUN_SEED=true) && node dist/main.js`.

### A2. Constantes de permisos

1. `src/common/rbac/permission.constants.ts`:
   - `ModuleCode.PLATFORM`, `ModuleCode.PLATFORM_BUSINESSES`.
   - `Permission.PLATFORM_BUSINESSES_VIEW`, `PLATFORM_BUSINESSES_MANAGE`, `PLATFORM_OWNERS_RECOVER`.
   - `ALL_PERMISSION_CODES` → `BUSINESS_PERMISSION_CODES`; nuevo `PLATFORM_PERMISSION_CODES`.
   - `RoleCode.PLATFORM_ADMIN` y su nombre.
   - `ROLE_PERMISSIONS` dividido en `BUSINESS_ROLE_PERMISSIONS` y `PLATFORM_ROLE_PERMISSIONS`.
2. `src/business/system-roles.ts` — `syncSystemRoles(db, businessId, scope)` elige la matriz según el `scope` y guarda `scope` en cada rol y en cada `role_permissions`.
3. Test unitario: las dos listas de permisos no se cruzan y todo código de plataforma empieza por `platform.`.

### A3. Migración A — `scope`

`prisma/migrations/<timestamp>_platform_scope/migration.sql`, en este orden:

1. `CREATE TYPE access_scope AS ENUM ('BUSINESS', 'PLATFORM')`.
2. `businesses`: agregar `scope` con `DEFAULT 'BUSINESS'`, `UNIQUE (id, scope)` y el índice único parcial `WHERE scope = 'PLATFORM'`.
3. `modules`: agregar `scope` (rellena con `BUSINESS`), `UNIQUE (id, scope)`.
4. `permissions`: agregar `scope`, quitar la FK simple a `modules`, crear `FK (module_id, scope)`, `UNIQUE (id, scope)`.
5. `roles`: agregar `scope`, quitar la FK simple a `businesses`, crear `FK (business_id, scope)`, `UNIQUE (id, scope)`.
6. `role_permissions`: agregar `scope`, crear `FK (role_id, scope)` y `FK (permission_id, scope)`.
7. Quitar los `DEFAULT` de `scope` en `modules`, `permissions`, `roles` y `role_permissions`.

`schema.prisma`: enum `AccessScope` y relaciones compuestas. Como en `user_roles`, el campo `scope` de `role_permissions` participa en dos relaciones: crear filas con inputs escalares (`roleId`, `permissionId`, `scope`), no con `connect`.

### A4. Claim `accessScope` y guard de ámbito

1. `src/common/interfaces/jwt-payload.interface.ts` y `parse-jwt-payload.ts` — `accessScope: 'BUSINESS' | 'PLATFORM'`, obligatorio.
2. `src/common/access/access.service.ts` — incluir `business.scope`; `mapToAccessProfile` expone `accessScope`.
3. `src/auth/token.service.ts` — firmar `accessScope`.
4. `src/common/decorators/` — `@AllowedScopes(...)`, `@PlatformOnly()`, `@AnyScope()`.
5. `src/common/guards/scope.guard.ts` — guard global registrado entre `JwtAuthGuard` y `PermissionsGuard`; si la ruta es `@Public()` no hace nada; si no hay metadata exige `BUSINESS`.
6. `src/auth/auth.controller.ts` — `@AnyScope()` en `me`, `change-password` y `logout-all`.
7. `src/catalog/catalog.service.ts` — filtrar módulos y permisos por `scope: BUSINESS`.
8. `src/roles/roles.service.ts` — al crear o editar roles, guardar el `scope` del negocio del actor en el rol y en sus permisos.
9. `src/business/business-provisioning.service.ts` — `syncSystemRoles(tx, id, BUSINESS)`.

### A5. Errores con `code`

1. `src/common/filters/http-exception.filter.ts` — `ErrorShape` agrega `code?: string`, leído del cuerpo de la excepción.
2. `src/common/errors/error-codes.ts` — constantes de los códigos.
3. `src/auth/auth.service.ts` — `USER_INACTIVE` en el login (el de negocio suspendido llega en la fase B).

### A6. Pruebas y documentación de la fase A

1. E2E en `test/platform-scope.e2e-spec.ts`: criterios de la fase A de `spec.md`.
2. E2E de base: inserción directa con Prisma de un `role_permissions` con ámbitos mezclados → error de FK.
3. Actualizar los e2e existentes que dependen de `ALL_PERMISSION_CODES` o del catálogo completo.
4. `backend/auth-service/README.md`: bootstrap, seed, `platform:create-admin`, claim `accessScope`, códigos de error.

## Implementación — Fase B

### B1. Migración B — estado, enlaces y auditoría

`prisma/migrations/<timestamp>_platform_operations/migration.sql`:

1. `CREATE TYPE business_status AS ENUM ('ACTIVE', 'SUSPENDED')`; agregar `businesses.status`, rellenar con `CASE WHEN is_active THEN 'ACTIVE' ELSE 'SUSPENDED' END`, quitar `is_active`.
2. `CHECK (scope = 'BUSINESS' OR status = 'ACTIVE')`.
3. `CREATE TYPE platform_action AS ENUM (...)`.
4. Tabla `password_reset_tokens` con sus `CHECK`, `UNIQUE (token_hash)` y el índice único parcial por usuario.
5. Tabla `platform_audit_events` con sus `CHECK` y el índice `(business_id, created_at DESC)`.

### B2. Estado del negocio en el código existente

1. `src/common/access/access.service.ts` — activo = `user.isActive && business.status === 'ACTIVE'`.
2. `src/auth/auth.service.ts` — negocio suspendido → `403` con `BUSINESS_SUSPENDED`.
3. `src/business/` — `BusinessProfileEntity.isActive` → `status`.
4. Tests existentes que usan `isActive` sobre negocios → `status`.

### B3. Módulo `platform`

1. `src/platform/platform.module.ts`, `platform-businesses.controller.ts` (`@PlatformOnly()` a nivel de clase, permisos por ruta).
2. `platform-businesses.service.ts`:
   - `list(query)`: consulta paginada que excluye `scope = PLATFORM`, cuenta usuarios, calcula `lastActivityAt` y resuelve dueños. Si la búsqueda por email de dueños complica la consulta con Prisma, usar `$queryRaw` parametrizado.
   - `detail(id)`: datos del negocio, dueños y los últimos 20 eventos.
   - `suspend(id, reason, actor)` y `reactivate(id, reason, actor)`: transacción con `FOR UPDATE`, cambio de estado, revocación de refresh tokens del negocio en un solo `UPDATE` y evento de auditoría.
3. `platform-actor.service.ts` — comprueba en la base que el actor siga activo, pertenezca al negocio de plataforma y tenga el permiso; se llama al inicio de cada acción.
4. `platform-audit.service.ts` — `record(tx, event)`; único lugar que escribe en `platform_audit_events`.
5. DTOs: `ListBusinessesQueryDto` (`page`, `pageSize`, `search`, `status`), `SuspendBusinessDto`, `ReactivateBusinessDto`. Entidades de respuesta y `PageEntity<T>`.

### B4. Enlaces de recuperación

1. `src/platform/owner-recovery.service.ts` — valida que el usuario sea `OWNER` activo del negocio; en una transacción borra sus enlaces pendientes, crea el nuevo (hash SHA-256, `PASSWORD_RESET_TTL`) y registra el evento. Respuesta con `Cache-Control: no-store`.
2. `src/auth/password-reset.service.ts` — consumo atómico (`updateMany` con `used_at IS NULL AND expires_at > now()` y `count === 1`, como `consumeRefreshToken`), luego en la misma transacción: nueva contraseña y revocación de todas las sesiones.
3. `src/auth/auth.controller.ts` — `POST /auth/password-reset`, `@Public()`, `@Throttle` de 5 por 15 minutos.
4. `src/common/config/auth.config.ts` — `passwordResetTtlMs()` (`PASSWORD_RESET_TTL`, `1h` por defecto).
5. `.env.example` y `docker-compose.yml` — `PASSWORD_RESET_TTL`.

### B5. Pruebas y documentación de la fase B

1. E2E en `test/platform-operations.e2e-spec.ts`: criterios de la fase B de `spec.md`, incluida la concurrencia del enlace.
2. Limpieza de los e2e: borrar `platform_audit_events` y `password_reset_tokens` antes que usuarios y negocios (las FKs son `RESTRICT`).
3. README de auth-service: rutas de plataforma, procedimiento para entregar enlaces, ventana de suspensión.

## Decisiones

- **Dos migraciones, una por fase.** La fase B puede esperar sin dejar tablas sin uso en la base.
- **UUID fijo para el negocio de plataforma.** El bootstrap lo encuentra con un upsert simple; el índice único parcial impide un segundo negocio de plataforma aunque alguien cambie el código.
- **Advisory lock en el bootstrap.** Dos réplicas que arrancan a la vez no compiten creando el catálogo.
- **`$queryRaw` permitido solo para el listado.** El resto sigue con el cliente de Prisma; las consultas crudas siempre van parametrizadas.
- **El guard de ámbito se queda en auth-service en esta feature.** [005](../005-api-gateway-comunicacion/spec.md) lo mueve al paquete compartido junto con los demás guards.

## Riesgos

- **Migración A con FKs nuevas sobre datos existentes:** si alguna fila quedara sin rellenar, la FK falla. Mitigación: rellenar antes de crear las FKs, todo en la misma migración, y probarla sobre una copia de la base local con datos.
- **Prisma y campos compartidos entre relaciones:** los inputs anidados pueden no aceptar `scope` en dos relaciones. Mitigación: crear `role_permissions` con inputs escalares, como ya se hace con `user_roles`.
- **Tokens viejos sin `accessScope`:** responden `401` hasta que el cliente renueve. Mitigación: el refresh token no cambia; el interceptor del frontend renueva solo.
- **Ventana de 15 minutos al suspender:** documentada en la spec; 005 la reduce con la caché del gateway.
- **Ingeniería social para obtener un enlace:** mitigación operativa: enviarlo solo al email registrado o verificar identidad antes.
- **Tests que dependen del catálogo completo:** al separar ámbitos cambian los conteos. Mitigación: tareas explícitas para actualizarlos en A6.
