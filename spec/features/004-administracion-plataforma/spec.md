# 004 · Administración de plataforma

**Estado:** propuesta (fase A y fase B pendientes de implementar)

## Qué hace

Agrega un nivel **por encima de los negocios** para el equipo de NexoStock. Los dueños siguen registrándose solos y administrando su tienda ([003](../003-negocio-aislamiento/spec.md)); la plataforma, además, puede:

- ver la lista de negocios registrados y su actividad general;
- suspender y reactivar un negocio;
- ayudar a un dueño que perdió el acceso, con un enlace de recuperación de un solo uso.

Administrar la plataforma significa **supervisar**, no operar tiendas. El equipo de plataforma no ve ni modifica productos, inventario, ventas ni empleados de un negocio, y la base de datos lo impide aunque el código tenga un error.

La feature también corrige el arranque en producción: hoy el catálogo de permisos solo lo crea el seed, que se niega a correr en producción, así que el registro de negocios falla ahí.

## Por qué

- **Nadie puede suspender un negocio.** 003 dejó la desactivación pendiente porque no existía un rol por encima de los negocios. Ante un negocio falso o un abuso, la única salida es editar la base a mano.
- **Un dueño puede quedarse fuera para siempre.** Solo existe `change-password`, que exige sesión. Si el único `OWNER` olvida su contraseña, nadie puede ayudarlo.
- **La plataforma no tiene visibilidad.** No hay forma de saber cuántos negocios existen ni cuáles están activos.
- **El registro falla en producción.** `src/seed.ts` crea los módulos y permisos, pero se niega a ejecutarse con `NODE_ENV=production`, que es justo la configuración que pide el README para producción. Con el catálogo vacío, `POST /api/auth/register` falla en `syncSystemRoles`.

## Terminología

| Término (UI / docs) | Código / persistencia | Significado |
| --- | --- | --- |
| Ámbito de acceso | enum `AccessScope` (`BUSINESS`, `PLATFORM`); columna `scope`; claim `accessScope` | Separa lo que pertenece a una tienda de lo que pertenece a la plataforma |
| Negocio de plataforma | fila de `businesses` con `scope = 'PLATFORM'` | Negocio especial y único donde viven los administradores de plataforma. No es una tienda |
| Administrador de plataforma | usuario del negocio de plataforma con rol `PLATFORM_ADMIN` | Persona del equipo de NexoStock |
| Estado del negocio | enum `BusinessStatus` (`ACTIVE`, `SUSPENDED`); columna `status` | Reemplaza a `is_active` |
| Enlace de recuperación | tabla `password_reset_tokens` | Enlace de un solo uso para fijar una contraseña nueva |
| Evento de auditoría | tabla `platform_audit_events` | Registro de cada acción de plataforma: quién, qué, sobre qué y por qué |

## Qué puede y qué no puede hacer la plataforma

| Puede | No puede |
| --- | --- |
| Listar negocios con nombre, dueños, estado, cantidad de usuarios, fecha de alta y última actividad | Ver o modificar productos, inventario, ventas ni reportes de un negocio |
| Ver el detalle de un negocio y su historial de acciones de plataforma | Ver datos de los empleados más allá de cuántos son |
| Suspender y reactivar un negocio, siempre con motivo registrado | Crear, editar o desactivar usuarios de un negocio |
| Generar un enlace de recuperación para un `OWNER` activo | Conocer o fijar la contraseña de nadie |
| | Entrar a una tienda como si fuera su dueño (suplantación) |

## Diseño

### 1. Identidad: el negocio de plataforma

Los administradores de plataforma son usuarios normales de un negocio especial con `scope = 'PLATFORM'`. Reutilizan el login, la rotación de refresh tokens, `change-password` y `logout-all` sin duplicar código, y `users.business_id` sigue siendo NOT NULL.

- Solo puede existir **un** negocio de plataforma (índice único parcial).
- El negocio de plataforma no puede suspenderse (`CHECK`).
- No aparece en los listados de plataforma y responde `404` si se intenta operar sobre él.

### 2. Claim `accessScope` y guard de ámbito

El access token agrega el claim `accessScope` (`BUSINESS` o `PLATFORM`), calculado por auth-service desde `businesses.scope` al emitirlo. No se llama `scope` porque en OAuth ese claim significa otra cosa.

Un guard global (`ScopeGuard`) exige `BUSINESS` **por defecto** en toda ruta protegida:

- `@PlatformOnly()` marca las rutas de plataforma.
- `@AnyScope()` marca las rutas comunes: `GET /auth/me`, `POST /auth/change-password`, `POST /auth/logout-all`.
- Una ruta que nadie marcó queda cerrada para los tokens `PLATFORM` (falla cerrado).

El catálogo (`GET /modules`, `GET /permissions`) es solo `BUSINESS` y devuelve únicamente módulos y permisos de ese ámbito: un negocio nunca ve que existen permisos de plataforma.

### 3. Permisos y rol de plataforma

| Permiso | Para qué |
| --- | --- |
| `platform.businesses.view` | Listar negocios y ver su detalle e historial |
| `platform.businesses.manage` | Suspender y reactivar |
| `platform.owners.recover` | Generar enlaces de recuperación para dueños |

- Viven en el módulo raíz `platform` con el hijo `platform-businesses`, ambos con `scope = 'PLATFORM'`.
- El rol de sistema `PLATFORM_ADMIN` del negocio de plataforma tiene los tres.
- En código, `ALL_PERMISSION_CODES` se divide en `BUSINESS_PERMISSION_CODES` (lo único que recibe `OWNER`) y `PLATFORM_PERMISSION_CODES`.
- Tener tres permisos permite crear más adelante un rol de soporte que vea negocios y recupere accesos sin poder suspender.

### 4. La base impide mezclar ámbitos

Hoy solo el código (`assertGrantable`) impide que un rol reciba permisos indebidos. Esta feature lo lleva a Postgres con el mismo patrón de FKs compuestas que ya usa `user_roles`:

```text
businesses(id, scope) ◄── roles(business_id, scope)
roles(id, scope)      ◄── role_permissions(role_id, scope)
permissions(id, scope)◄── role_permissions(permission_id, scope)
modules(id, scope)    ◄── permissions(module_id, scope)
```

`role_permissions` exige que el rol y el permiso tengan el mismo `scope`, y cada uno lo hereda por FK. Resultado:

- un rol de tienda no puede recibir `platform.*`;
- un rol de plataforma no puede recibir `products.manage` ni ningún permiso de tienda, así que la plataforma tampoco puede operar tiendas desde su propio negocio.

`scope` se repite en cinco tablas, pero no es redundancia descontrolada: las FKs obligan a que todas las copias coincidan y existen solo para que la base pueda imponer la regla.

### 5. Suspender y reactivar

- `businesses.is_active` se reemplaza por `status` (`ACTIVE`, `SUSPENDED`). Un booleano no distingue "suspendido" de un futuro "pendiente de aprobación"; con el enum, agregar `PENDING` no exige migrar datos.
- Suspender exige un motivo; reactivar lo admite opcional.
- En una sola transacción, con `SELECT ... FOR UPDATE` sobre el negocio: cambia el estado, revoca los refresh tokens de todos sus usuarios y escribe el evento de auditoría.
- Repetir la acción sobre un negocio que ya está en ese estado responde `409` y no escribe un evento nuevo.
- Mientras está suspendido, el login responde `403` con `code: BUSINESS_SUSPENDED` y el refresh responde `401`.
- **Ventana conocida:** el access token no se consulta contra la base. Un token emitido antes de la suspensión sigue siendo válido hasta que caduca (`JWT_EXPIRES_IN`, 15 minutos por defecto). [005](../005-api-gateway-comunicacion/spec.md) reduce esa ventana a la caché del gateway.

### 6. Recuperar el acceso de un dueño

El administrador genera un **enlace de un solo uso** para un `OWNER` activo; el dueño lo abre y elige su contraseña nueva. Se descartó la contraseña temporal porque exige una "sesión restringida" que todos los servicios tendrían que respetar, y porque el administrador llegaría a conocer la contraseña.

- Funciona como los refresh tokens: se guarda solo el hash SHA-256, caduca (`PASSWORD_RESET_TTL`, 1 hora por defecto) y se usa una vez.
- Generar un enlace nuevo invalida el anterior: como máximo hay un enlace pendiente por usuario (índice único parcial).
- La API devuelve el token **una sola vez**, con `Cache-Control: no-store`. El frontend arma `/reset-password#token=<token>`: lo que va después del `#` no viaja al servidor ni queda en logs.
- Al usarlo: se fija la contraseña, se marca el enlace como usado y se revocan todas las sesiones del dueño. No inicia sesión automáticamente.
- Cualquier fallo (enlace desconocido, usado, vencido o de un usuario inactivo) responde lo mismo: `400` con `code: RESET_LINK_INVALID`.
- **Procedimiento operativo:** el enlace se envía al email registrado del dueño desde el correo de soporte. Entregarlo por otro canal exige verificar antes la identidad con los datos registrados del negocio.

El mismo mecanismo servirá después para "olvidé mi contraseña" por correo y para invitar al dueño de un negocio creado a mano: solo cambia cómo se entrega el enlace.

### 7. Auditoría

Cada acción de plataforma escribe un evento en `platform_audit_events`, en la misma transacción que la acción. La tabla solo admite inserciones desde la aplicación.

Para no guardar el mismo dato dos veces:

- el motivo de una suspensión vive solo en la auditoría; `businesses` guarda el estado actual;
- quién generó un enlace vive solo en la auditoría, no en `password_reset_tokens`.

### 8. Arranque: bootstrap y seed separados

| Proceso | Cuándo corre | Qué hace |
| --- | --- | --- |
| `bootstrap` | En cada arranque, también en producción | Crea o actualiza el catálogo, asegura el negocio de plataforma y sincroniza los roles de sistema de todos los negocios. No crea usuarios. Es idempotente y toma un advisory lock para que dos réplicas no choquen |
| `seed` | Solo desarrollo (`RUN_SEED=true`) | Ejecuta el bootstrap y crea el negocio demo (`admin@nexostock.local`) y un administrador de plataforma (`platform@nexostock.local`) con contraseñas conocidas |
| `platform:create-admin` | A mano, una vez por administrador | Crea un administrador de plataforma en cualquier entorno. Lee email y contraseña de variables de entorno, nunca de argumentos, para que no queden en el historial de la terminal. No sobrescribe una cuenta existente |

### 9. Errores con código

Los errores agregan un campo opcional `code` (MAYÚSCULAS con guiones bajos y estable), para que el frontend no dependa del texto del mensaje:

```json
{ "statusCode": 403, "message": "Tu negocio está suspendido. Contacta al equipo de NexoStock.", "error": "Forbidden", "code": "BUSINESS_SUSPENDED" }
```

Códigos que introduce esta feature: `BUSINESS_SUSPENDED`, `USER_INACTIVE`, `BUSINESS_ALREADY_SUSPENDED`, `BUSINESS_ALREADY_ACTIVE`, `RESET_LINK_INVALID`.

## API

Todas las rutas de plataforma son `@PlatformOnly()` y, antes de ejecutar una acción, comprueban en la base que quien la pide siga siendo un administrador activo (el token no se revisa contra la base).

| Método y ruta | Permiso | Respuesta |
| --- | --- | --- |
| `GET /api/platform/businesses?search=&status=&page=&pageSize=` | `platform.businesses.view` | Página de negocios (ver abajo) |
| `GET /api/platform/businesses/:id` | `platform.businesses.view` | Detalle con dueños y los últimos 20 eventos de auditoría |
| `POST /api/platform/businesses/:id/suspend` | `platform.businesses.manage` | `{ reason }` (3 a 500 caracteres) → detalle actualizado |
| `POST /api/platform/businesses/:id/reactivate` | `platform.businesses.manage` | `{ reason? }` → detalle actualizado |
| `POST /api/platform/businesses/:id/owners/:userId/reset-link` | `platform.owners.recover` | `201 { token, expiresAt }` |
| `POST /api/auth/password-reset` | Pública, 5 intentos por 15 minutos e IP | `{ token, newPassword }` → `204` |

- **Listado:** `search` busca en nombre, razón social, identificación tributaria (`taxId`) y email de los dueños. `status` filtra por estado. Orden: más recientes primero. `pageSize` va de 1 a 100 (20 por defecto).
- **Formato de página** (primera ruta paginada de NexoStock; convención para todos los servicios):

```json
{ "items": [], "total": 0, "page": 1, "pageSize": 20 }
```

- **Cada negocio del listado:** `id`, `name`, `legalName`, `taxId`, `status`, `createdAt`, `owners` (`id`, `email`, `firstName`, `lastName`), `userCount` y `lastActivityAt` (último login de cualquiera de sus usuarios).
- **`newPassword`** sigue la misma política que el registro: de 8 a 72 caracteres, con al menos una letra y un número.
- **Rutas existentes:** `GET /api/business/me` reemplaza `isActive` por `status`.

## Esquema (cambios sobre 003)

```text
enum access_scope:     BUSINESS | PLATFORM
enum business_status:  ACTIVE | SUSPENDED
enum platform_action:  BUSINESS_SUSPENDED | BUSINESS_REACTIVATED | OWNER_RESET_LINK_ISSUED

businesses
  + scope access_scope NOT NULL DEFAULT 'BUSINESS'
  + status business_status NOT NULL DEFAULT 'ACTIVE'          (reemplaza is_active)
  UNIQUE (id, scope)
  UNIQUE INDEX parcial (scope) WHERE scope = 'PLATFORM'        un solo negocio de plataforma
  CHECK (scope = 'BUSINESS' OR status = 'ACTIVE')              la plataforma no se suspende

modules
  + scope access_scope NOT NULL
  UNIQUE (id, scope)

permissions
  + scope access_scope NOT NULL
  FK (module_id, scope) → modules(id, scope)        ON DELETE CASCADE   (reemplaza la FK simple)
  UNIQUE (id, scope)

roles
  + scope access_scope NOT NULL
  FK (business_id, scope) → businesses(id, scope)   ON DELETE RESTRICT  (reemplaza la FK simple)
  UNIQUE (id, scope)

role_permissions
  + scope access_scope NOT NULL
  FK (role_id, scope)       → roles(id, scope)        ON DELETE CASCADE
  FK (permission_id, scope) → permissions(id, scope)  ON DELETE CASCADE

password_reset_tokens
  id UUID PK
  user_id → users.id                                ON DELETE CASCADE
  token_hash UNIQUE (SHA-256)
  expires_at, used_at?, created_at (timestamptz)
  CHECK (expires_at > created_at)
  CHECK (used_at IS NULL OR used_at >= created_at)
  UNIQUE INDEX parcial (user_id) WHERE used_at IS NULL     un enlace pendiente por usuario

platform_audit_events
  id UUID PK
  actor_user_id  → users.id                         ON DELETE RESTRICT
  action platform_action NOT NULL
  business_id    → businesses.id                    ON DELETE RESTRICT
  target_user_id → users.id (nullable)              ON DELETE RESTRICT
  reason?, created_at (timestamptz)
  CHECK (action <> 'BUSINESS_SUSPENDED' OR length(btrim(reason)) > 0)
  CHECK (action <> 'OWNER_RESET_LINK_ISSUED' OR target_user_id IS NOT NULL)
  INDEX (business_id, created_at DESC)
```

Los `DEFAULT` de `scope` en `modules`, `permissions`, `roles` y `role_permissions` solo existen durante la migración para rellenar filas viejas; después se quitan, así el código siempre indica el ámbito de forma explícita.

## Contrato JWT (cambio sobre 003)

Claims: `sub`, `email`, `businessId`, `accessScope`, `roles`, `permissions`.

- Un access token sin `accessScope` responde `401`. El frontend renueva con su refresh token (opaco, no cambia) y recibe un access token con el claim nuevo, así que no hace falta forzar un nuevo inicio de sesión.
- Para un administrador de plataforma, `businessId` es el del negocio de plataforma. Cualquier servicio de tienda que reciba ese token lo rechaza por ámbito; aunque no lo hiciera, filtraría por un negocio sin datos.

## Criterios de aceptación

_Cada criterio se comprueba con sí/no. Marcar `[x]` al cumplirse._

### Fase A — Cimientos

- [ ] Con `NODE_ENV=production` y sin seed, el arranque crea el catálogo y el negocio de plataforma, y `POST /api/auth/register` funciona.
- [ ] El bootstrap es idempotente: correrlo dos veces seguidas, o en dos réplicas a la vez, no duplica nada.
- [ ] Solo existe un negocio con `scope = 'PLATFORM'`; insertar un segundo falla en la base.
- [ ] Insertar a mano en `role_permissions` un permiso `PLATFORM` para un rol de tienda falla en la base, y también al revés.
- [ ] Un `OWNER` recién registrado no tiene ningún permiso `platform.*`.
- [ ] `GET /api/modules` y `GET /api/permissions` no muestran nada de plataforma a un negocio.
- [ ] El access token lleva `accessScope` coherente con el negocio del usuario; un token sin el claim responde `401`.
- [ ] Un token `PLATFORM` recibe `403` en `/users`, `/roles`, `/modules`, `/permissions` y `/business/me`.
- [ ] Un token `PLATFORM` puede usar `GET /auth/me`, `change-password` y `logout-all`.
- [ ] `platform:create-admin` crea un administrador que puede iniciar sesión y no sobrescribe una cuenta existente.
- [ ] Los errores de login por usuario inactivo incluyen `code: USER_INACTIVE`.

### Fase B — Funciones de plataforma

- [ ] Un token `BUSINESS`, incluso de un `OWNER`, recibe `403` en `/api/platform/*`.
- [ ] El listado pagina, busca y filtra por estado, y nunca incluye el negocio de plataforma.
- [ ] El listado y el detalle no exponen datos operativos ni datos de empleados más allá de `userCount`.
- [ ] Suspender sin motivo responde `400`; con motivo cambia el estado, revoca los refresh tokens del negocio y deja un evento de auditoría.
- [ ] Con el negocio suspendido, el login responde `403 BUSINESS_SUSPENDED` y el refresh responde `401`.
- [ ] Al reactivar, sus usuarios vuelven a iniciar sesión.
- [ ] Suspender un negocio ya suspendido responde `409 BUSINESS_ALREADY_SUSPENDED` sin evento nuevo; reactivar uno activo responde `409 BUSINESS_ALREADY_ACTIVE`.
- [ ] Operar sobre el negocio de plataforma responde `404`.
- [ ] Un enlace de recuperación solo se genera para un `OWNER` activo del negocio indicado; para cualquier otro usuario responde `404`.
- [ ] El enlace funciona una vez, caduca, y de dos usos simultáneos solo pasa uno.
- [ ] Generar un enlace nuevo invalida el anterior.
- [ ] Usar el enlace cierra todas las sesiones del dueño.
- [ ] Un administrador desactivado no puede ejecutar acciones de plataforma aunque su access token siga vigente.
- [ ] Cada acción de plataforma deja exactamente un evento con actor, acción, negocio, usuario afectado (si aplica) y motivo.

### Interfaz (cuando exista el frontend)

- [ ] Después del login, un token `PLATFORM` va al panel `/platform` y un token `BUSINESS` al panel de la tienda.
- [ ] La lista de negocios permite buscar, filtrar por estado y paginar.
- [ ] Suspender pide el motivo y una confirmación explícita.
- [ ] El enlace generado se muestra una sola vez, con botón de copiar y fecha de vencimiento.
- [ ] La página `/reset-password` lee el token del fragmento `#`, lo borra de la URL y muestra un mensaje claro si el enlace no sirve.
- [ ] Un usuario de un negocio suspendido ve un mensaje que explica la suspensión, no un error genérico.

## Fuera de alcance

- **Aprobación de registros:** el enum `business_status` queda listo para agregar `PENDING`.
- **Crear negocios a mano desde la plataforma:** se resolverá reutilizando el enlace de recuperación como invitación.
- **Gestionar administradores de plataforma por API:** por ahora solo con `platform:create-admin`.
- **Recuperación de contraseña por correo** sin intervención del equipo: requiere SMTP; reutilizará `password_reset_tokens`.
- **Suplantar a un usuario** para dar soporte: excluido a propósito.
- **MFA** para administradores de plataforma: recomendable más adelante, porque es la cuenta más sensible.
- **Facturación, planes o cuotas por negocio.**
- **Reportes globales con datos operativos** de todos los negocios.

## Decisiones

- **Negocio de plataforma en vez de una tabla `platform_admins`.** Reutiliza login, refresh, cambio de contraseña y tests ya probados. Se descartó la tabla aparte porque duplica código de seguridad sensible, y el flag `users.is_platform_admin` porque obliga a volver opcional `business_id` y debilita todas las FKs compuestas.
- **FKs compuestas en vez de un trigger** para separar ámbitos. Son declarativas, Prisma las conoce y siguen el patrón de `user_roles`.
- **`status` en vez de `is_active`.** Expresa la suspensión y deja lugar a `PENDING` sin cambiar el tipo de la columna.
- **Enlace de un solo uso en vez de contraseña temporal.** No crea estados de sesión especiales y el administrador nunca conoce la contraseña.
- **El motivo vive solo en la auditoría.** `businesses` guarda el estado actual; el historial no se duplica.
- **Claim `accessScope` y no `scope`.** Evita confundirlo con el claim estándar de OAuth.
- **Suspender y reactivar son acciones (`POST .../suspend`), no un `PATCH` del estado.** Cada una exige su propio cuerpo, motivo y evento.
- **`409` al repetir una acción.** Hace visible el conflicto y evita eventos duplicados.
- **Fase A antes que la fase B.** La fase A fija el contrato del token y corrige producción, y conviene tenerla antes de [005](../005-api-gateway-comunicacion/spec.md) y de los servicios operativos. La fase B puede esperar al flujo principal si el tiempo aprieta (principio de prioridad funcional de la misión).

## Documentos relacionados

- [003 · Aislamiento por Negocio](../003-negocio-aislamiento/spec.md)
- [005 · API Gateway y comunicación interna](../005-api-gateway-comunicacion/spec.md)
- [001 · Autenticación y acceso por rol](../001-nombre-feature/spec.md)
- [Tecnologías y convenciones](../../constitution/tech-stack.md)
