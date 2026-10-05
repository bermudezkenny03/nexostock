# 003 · Aislamiento por Negocio (multi-tenant lógico)

**Estado:** en progreso (auth-service fase 2 implementado, con registro self-service de negocios; gateway y servicios operativos pendientes)

## Qué hace

Define cómo NexoStock separa los datos y las operaciones de **cada negocio** (cliente del producto) sin convertir la plataforma en un SaaS multi-empresa completo desde el MVP. Cada negocio tiene su propio catálogo operativo, usuarios, roles y ventas; ningún usuario autenticado puede leer ni modificar registros de otro negocio.

En la interfaz se habla de **Negocio**; en código, APIs, base de datos y tokens se usa **Business** y **`businessId`**.

## Por qué

La misión apunta a pequeños y medianos negocios que operan de forma independiente (`constitution/mission.md`). Aunque el MVP puede desplegarse para un solo cliente, el diseño debe permitir alojar varios negocios en la misma instancia sin mezclar información comercial ni credenciales. Este documento fija las reglas antes de que productos, inventario y ventas persistan datos masivos difíciles de migrar.

El patrón de referencia es el de **Propia Arepa** y proyectos similares: una entidad **Negocio** como frontera de datos, usuarios pertenecientes a un negocio y roles definidos **por negocio**, con catálogo global de módulos y permisos. Del modelo SaaS clásico se adopta solo el **registro público de negocios** (`POST /api/auth/register`): cualquiera puede dar de alta su negocio y queda como propietario. **No** se adopta tenant + company. El proveedor del SaaS (`SUPER_ADMIN`) y los planes se definen en [004 · NexoStock como SaaS](../004-saas/spec.md).

## Terminología

| Término (UI / docs) | Código / persistencia | Significado |
| --- | --- | --- |
| Negocio | `Business`, tabla `businesses` | Unidad de aislamiento: tienda, papelería, etc. |
| Identificador del negocio | `businessId` (UUID) | Clave foránea en tablas operativas y en el JWT |
| Catálogo de permisos | `modules`, `permissions` | Global a la plataforma; mismo árbol para todos los negocios |
| Rol | `roles` con alcance por negocio | Conjunto de permisos **dentro de un negocio** |
| Usuario | `users` | Persona con credenciales; pertenece a **un** negocio |
| Identidad visual | `primary_color`, `logo_url` | Color `#RRGGBB` y URL del logo del negocio; ambos opcionales |

## Fases de evolución

### Fase 1 — MVP (negocio único implícito)

**Alcance:** documentación y convenciones; **sin** cambios obligatorios en esquema ni código.

- Se asumía **exactamente un negocio** por despliegue o demostración académica.
- En esa fase no había tabla `businesses` ni `businessId`. El auth-service ya no está ahí: ver «Estado actual del auth-service».
- Los demás servicios, cuando persistan datos, deben diseñarse ya pensando en añadir `businessId` en fase 2 (columna nullable o migración planificada), pero no es requisito del MVP si aún no hay persistencia operativa.
- La feature [001 · Autenticación y acceso por rol](../001-nombre-feature/spec.md) sigue válida: roles globales en seed, un solo “mundo” de datos.

**Objetivo:** entregar flujo productos–inventario–ventas sin bloquearse en multi-tenant; este spec evita decisiones contradictorias en fase 1.

### Fase 2 — Multi-negocio (v2, activación explícita del equipo)

**Alcance:** aislamiento **obligatorio** en auth y en todas las tablas operativas.

1. **Auth (`auth-service`, esquema propio)**
   - Tabla `businesses` (nombre comercial, identificadores legales opcionales, `isActive`, `primaryColor`, `logoUrl`, marcas de tiempo).
   - Columna `users.business_id` NOT NULL (FK a `businesses`).
   - Tabla `roles`: deja de ser global única por `code`; pasa a **`@@unique([businessId, code])`**. Los roles de sistema (`isSystem`) se **siembran por negocio** (propietario, administrador de inventario, empleado de ventas), no una sola fila global.
   - `modules` y `permissions`: **sin** `businessId`; catálogo único.
   - `user_roles` guarda `business_id` y enlaza usuario y rol del mismo negocio (FKs compuestas). `role_permissions` enlaza rol ↔ permiso.
   - Validación de negocio: todo usuario activo tiene `businessId`; las consultas de usuarios y roles del API filtran por el negocio del solicitante (propietario/administración).

2. **JWT y perfil**
   - El access token incluye `businessId` (UUID) además de `sub`, `email`, `roles`, `permissions`.
   - El API Gateway y cada servicio confían en el token firmado por auth; **no** aceptan `businessId` arbitrario en el cuerpo o query para “elegir” otro negocio.
   - Tras login, la respuesta de usuario expone `businessId` (y opcionalmente nombre del negocio para la UI).

3. **Servicios operativos** (`products-service`, `inventory-service`, `sales-service`, `reports-service`)
   - Toda tabla de negocio incluye `business_id` NOT NULL e índice compuesto donde aplique (p. ej. `(business_id, sku)`).
   - **Toda** lectura, listado, actualización y borrado aplica `WHERE business_id = :businessIdDelToken`.
   - Creaciones fijan `business_id` desde el contexto del JWT, no desde el cliente.

4. **Referencias entre servicios**
   - Los UUID de producto, venta, etc. son **referencias lógicas** entre servicios.
   - **No** hay claves foráneas entre esquemas PostgreSQL de distintos servicios.
   - Antes de usar un `productId` en ventas o inventario, el servicio valida existencia **en el mismo `businessId`** (consulta al servicio dueño o réplica local con la misma regla de filtro).

5. **Seed y despliegue**
   - Seed de fase 2: crear al menos un `Business`, usuarios con `businessId`, y roles por negocio clonando la matriz de la feature 001.
   - Entornos nuevos: un negocio por defecto + propietario inicial (equivalente al admin actual del seed).

### Fase 3 — Opcional (backlog de plataforma)

No forma parte de v2 salvo decisión explícita del equipo.

- Tabla **`business_user`** (M:N): un mismo login en varios negocios con rol distinto en cada uno.
- **`lastActiveBusinessId`** (o equivalente en sesión) para cambiar de negocio sin re-autenticarse.
- **Superadministrador de plataforma**: usuario sin negocio operativo o con flag `isPlatformAdmin`, capaz de listar/crear negocios y usuarios de soporte; **no** mezclado con el rol “propietario” del negocio.
- Facturación por tenant, subdominios por negocio: fuera de alcance hasta nueva spec. (El onboarding self-service ya está en fase 2: ver «Registro de negocios».)

## Estado actual del auth-service (fase 2 implementada)

El `auth-service` ya aísla por negocio. Una sola migración (`20251001000000_init_auth`) crea el esquema completo; detalle de rutas en `backend/auth-service/README.md`.

### Datos

- **`businesses`:** nombre (no vacío), datos legales opcionales, `is_active`, `primary_color` (`#RRGGBB` o null, validado también con `CHECK`) y `logo_url` (http/https o null).
- **Tipos de columna:** los IDs son `UUID` nativos y las fechas `timestamptz`.
- **Pertenencia al negocio:** `users.business_id` y `roles.business_id` son NOT NULL, con FK a `businesses` y `ON DELETE RESTRICT`.
- **Email:** único en toda la instalación y siempre en minúsculas (`CHECK`).
- **Roles:** únicos por `(business_id, code)`, con código en `A-Z0-9_`. `modules` y `permissions` siguen globales.
- **Rol del usuario:**
  - `user_roles` tiene una fila por usuario (PK `user_id`) y guarda `business_id`.
  - Sus FKs compuestas a `users(id, business_id)` y `roles(id, business_id)` impiden que un usuario reciba un rol de otro negocio.
  - La FK hacia el rol es `RESTRICT`: un rol asignado no se puede borrar.
- **Refresh tokens:** `token_hash` es UNIQUE y existe `CHECK (expires_at > created_at)`.

### Registro de negocios

`POST /api/auth/register` es público y crea, en una sola transacción:

1. el negocio;
2. sus tres roles de sistema;
3. el primer usuario con rol `OWNER`.

Responde con la sesión ya iniciada. Se apaga con `REGISTRATION_ENABLED=false` y tiene un límite de 5 registros por hora y por IP. La misma función (`syncSystemRoles`) siembra los roles en el registro y en el seed, así que todos los negocios comparten la misma matriz.

### Sesión y JWT

- El JWT lleva `sub`, `email`, `businessId`, `roles` y `permissions`. Login y `GET /api/auth/me` añaden `businessName`, `businessPrimaryColor` y `businessLogoUrl`.
- Refresh tokens de un solo uso, con rotación atómica. Si se reutiliza uno ya usado, se cierran todas las sesiones del usuario.
- Además: `POST /api/auth/logout-all` y `POST /api/auth/change-password`.
- El login tarda lo mismo exista o no el email, para no revelar qué cuentas existen.

### Administración dentro del negocio

- `GET /api/business/me` está disponible para cualquier usuario del negocio. `PATCH /api/business/me` exige el permiso `business.manage` y no acepta `isActive`.
- Solo un `OWNER` puede crear, editar o asignar cuentas `OWNER`.
- Nadie puede desactivarse, cambiarse el rol ni resetearse la contraseña desde la administración de usuarios.
- El negocio siempre conserva un `OWNER` activo. La comprobación bloquea la fila del negocio para resistir peticiones concurrentes.
- Un rol solo puede otorgar permisos que tenga quien lo crea o edita, lo que impide la escalada de privilegios.

## Decisiones

- **Email global único.** Una instalación, muchas empresas; el mismo email no se repite en otro negocio.
- **Un usuario, un negocio y un rol.** `users.business_id` es obligatorio. `user_roles` tiene como mucho una fila por usuario. Los roles de sistema son Propietario (`OWNER`), Administrador de inventario (`INVENTORY_ADMIN`) y Empleado de ventas (`SALES_EMPLOYEE`), con la matriz de la feature 001. No hay tabla de membresía.
- **Identidad visual.** `primary_color` y `logo_url` viven en `businesses`. El color se valida como `#RRGGBB` y se guarda en mayúsculas. El logo es una URL http/https (sin subida de archivo). `null` los borra. Login y `/auth/me` los exponen junto al nombre.
- **Membresía y cambio de negocio: fase 3.** `business_user` (M:N), elegir negocio en el login y cambiar de negocio no se construyen ahora.
- **Alta de negocios: self-service.** El profesor pide un sistema multi-tenant, y un tenant que solo se crea desde el seed no lo es. `POST /api/auth/register` crea el negocio con su propietario sin necesitar un administrador de plataforma. Se puede cerrar con `REGISTRATION_ENABLED=false`.
- **Desactivación de negocios: la hace el `SUPER_ADMIN`** desde el panel de plataforma ([004](../004-saas/spec.md)). Un admin del negocio no puede desactivar el suyo en `PATCH /api/business/me`: se quedaría fuera.
- **`business.manage` separado de `users.manage`.** Editar la identidad del negocio es un permiso propio. Por defecto solo lo tiene `OWNER`.
- **Protección del propietario.** RBAC no basta: con `users.manage` se podría cambiar la contraseña del dueño o ascenderse a `OWNER`. Por eso las cuentas `OWNER` solo las gestiona otro `OWNER`, y nadie puede otorgar permisos que no tenga.

## Esquema auth (fase 2)

```text
businesses
  id UUID, name (CHECK no vacío), legal_name?, tax_id?,
  primary_color? (CHECK #RRGGBB), logo_url?, is_active, created_at, updated_at (timestamptz)

users
  business_id → businesses.id (NOT NULL, ON DELETE RESTRICT)
  UNIQUE (id, business_id)
  INDEX (business_id)
  email UNIQUE global, CHECK email = lower(email)
  last_login_at?

roles
  business_id → businesses.id (NOT NULL, ON DELETE RESTRICT)
  UNIQUE (business_id, code), CHECK code ~ '^[A-Z0-9_]+$'
  UNIQUE (id, business_id)

user_roles                         (un rol por usuario)
  PK (user_id)
  FK (user_id, business_id) → users(id, business_id)   ON DELETE CASCADE
  FK (role_id, business_id) → roles(id, business_id)   ON DELETE RESTRICT
  INDEX (role_id, business_id)

refresh_tokens
  token_hash UNIQUE (SHA-256), CHECK expires_at > created_at

modules, permissions
  globales, sin business_id
```

Reglas adicionales:

- Un usuario solo puede asignarse roles cuyo `businessId` coincida con el suyo (API y FK compuesta).
- El administrador gestiona usuarios **solo de su negocio**; no puede ver emails de otros negocios.
- Un negocio con `is_active = false` impide el login y el refresh de sus usuarios. Cambiar ese flag no está expuesto al admin del negocio.

## Otros servicios (fase 2)

| Servicio | Regla de aislamiento |
| --- | --- |
| `api-gateway` | Propaga el JWT; opcionalmente valida presencia de `businessId` en rutas protegidas; no reescribe el claim. |
| `products-service` | Productos, categorías y precios con `business_id`. |
| `inventory-service` | Existencias y movimientos con `business_id`; validación de `productId` coherente con negocio. |
| `sales-service` | Ventas y líneas con `business_id`; totales y descuentos de inventario acotados al negocio. |
| `reports-service` | Agregaciones siempre filtradas por `business_id`; sin reportes “globales” salvo fase 3 con superadmin. |

## Reglas de API (fase 2)

1. **Contexto de negocio:** sale únicamente del JWT (`businessId`), no de parámetros opcionales del cliente.
2. **Id expuesto en URL:** un `GET /products/:id` devuelve 404 si el recurso existe pero pertenece a otro negocio (no 403 con fuga de existencia, salvo política unificada acordada).
3. **Listados:** paginación y búsqueda dentro del negocio del token.
4. **Creación de usuarios (auth):** el propietario no envía `businessId`; el servicio lo toma del token del solicitante.
5. **Servicio a servicio:** llamadas internas incluyen `businessId` en metadata o header interno firmado, derivado del JWT original del usuario final, nunca hardcodeado.
6. **Errores:** mensajes comprensibles sin revelar datos de otros negocios (`constitution/tech-stack.md`, sección 7).

## Estrategia de seed (fase 2)

1. **Catálogo global (una vez):** árbol de `modules` y `permissions` como en el seed actual.
2. **Por negocio creado:**
   - Insertar filas `roles` con códigos `OWNER`, `INVENTORY_ADMIN`, `SALES_EMPLOYEE` (o equivalentes del RBAC) y `isSystem = true`.
   - Enlazar `role_permissions` según la matriz de la feature 001.
3. **Negocio demo:** al menos un `Business` “NexoStock Demo” y usuario propietario.
4. **Migración desde fase 1:** ver sección siguiente; el seed post-migración debe ser idempotente con negocio por defecto ya existente.

## Migración desde auth sin `businessId`

Orden recomendado (sin ejecutar en fase 1):

1. Crear tabla `businesses` e insertar **un** negocio por defecto (p. ej. “Negocio principal”).
2. Añadir `users.business_id` nullable → backfill con el UUID del negocio por defecto → NOT NULL + FK.
3. Duplicar roles globales actuales **por negocio**: para cada rol existente, crear fila con mismo `code` y `businessId` del negocio por defecto; remapear `user_roles.role_id` a los nuevos IDs; eliminar roles sin `businessId` (o migración en una transacción).
4. Ajustar restricción única en `roles` a `(business_id, code)`.
5. Desplegar auth que emite JWT con `businessId`; invalidar sesiones antiguas (rotación de refresh tokens o ventana de mantenimiento).
6. Migrar servicios operativos: añadir columna, backfill con el mismo UUID de negocio por defecto, NOT NULL, índices.
7. Actualizar gateway y frontend para mostrar nombre del negocio donde aplique (opcional en v2).

Datos de prueba existentes permanecen en el negocio por defecto; no se pierden usuarios si el backfill es correcto.

## Comparación: modelo Negocio vs SaaS multi-tenant clásico

| Aspecto | NexoStock (Negocio / fase 2) | SaaS tenant típico |
| --- | --- | --- |
| Unidad de aislamiento | `Business` (negocio cliente) | `Tenant` / `Organization` |
| Usuario | 1 negocio por usuario (fase 2) | A menudo M:N con cambio de contexto |
| Roles | Por negocio; permisos globales | A menudo por tenant + roles de plataforma |
| Catálogo de features | Módulos/permisos globales | A veces por plan o tenant |
| Superadmin plataforma | Fase 3 opcional | Suele existir desde v1 |
| Onboarding | Registro público del negocio (`POST /api/auth/register`); el propietario crea usuarios (001) | Registro público, invitaciones |
| FK entre microservicios | No; UUID + filtro `businessId` | Igual en muchos diseños distribuidos |
| Sucursales | Fuera de alcance (misión) | A veces “sites” bajo tenant |

NexoStock prioriza **simplicidad académica y PYMES** sobre elasticidad de plataforma; la fase 3 cierra brechas solo si el producto evoluciona hacia hosting multi-cliente gestionado.

## Criterios de aceptación (fase 2)

_Cada criterio se comprueba con sí/no. Marcar `[x]` al cumplirse cuando el equipo active v2._

### Negocio y usuarios

- [x] Existe al menos un registro en `businesses` y todo usuario activo tiene `businessId` válido.
- [x] Un propietario autenticado solo lista, crea, edita y desactiva usuarios de su negocio.
- [x] No es posible asignar a un usuario un rol cuyo `businessId` difiera del suyo.
- [x] Con un negocio desactivado, sus usuarios no pueden iniciar sesión.

### JWT y gateway

- [x] Tras login, el access token incluye `businessId` coherente con la base de datos.
- [ ] Una solicitud con token válido de otro negocio no puede leer ni modificar recursos operativos ajenos aunque conozca el UUID del recurso.
- [x] El cliente no puede sustituir el negocio enviando otro `businessId` en el cuerpo o query en operaciones normales de auth.

### Roles y permisos

- [x] Los códigos de rol pueden repetirse en distintos negocios pero son únicos dentro del mismo negocio.
- [x] El catálogo de módulos y permisos es idéntico para todos los negocios; los cambios de permisos del rol afectan solo al negocio del rol editado.
- [x] La matriz de la feature 001 se cumple dentro de cada negocio con los roles fijos `OWNER`, `INVENTORY_ADMIN` y `SALES_EMPLOYEE`.

### Registro y seguridad de cuentas

- [x] Un visitante puede registrar un negocio nuevo y queda como `OWNER` con los tres roles de sistema creados.
- [x] El negocio registrado no ve usuarios ni roles de otros negocios (y viceversa).
- [x] Un refresh token solo se puede usar una vez; reutilizarlo cierra todas las sesiones del usuario.
- [x] Un usuario sin rol `OWNER` no puede crear, editar ni asignar cuentas `OWNER`.
- [x] Nadie puede otorgar a un rol permisos que no tenga.
- [x] Un rol asignado no se puede borrar.
- [x] Los campos obligatorios enviados como `null` responden `400`, no `500`.

### Datos operativos

- [ ] Productos, inventario, ventas y reportes solo exponen datos con el `businessId` del token.
- [ ] Referencias cruzadas entre servicios rechazan pares (`businessId`, `productId`) inconsistentes.

### Migración

- [ ] Un entorno fase 1 migrado conserva usuarios y roles equivalentes bajo el negocio por defecto.
- [ ] Tras migración, es necesario volver a autenticarse para obtener tokens con `businessId`.

## Fuera de alcance

- Sucursales o almacenes múltiples bajo un mismo negocio (`constitution/mission.md`).
- Facturación, límites por plan o cuotas por negocio.
- Fase 3: membresía `business_user`, elegir negocio al iniciar sesión y cambiar de negocio.
- Desactivar o reactivar un negocio: se define en [004](../004-saas/spec.md).
- Subida de archivo de logo; solo URL.
- Replicación geográfica o base de datos dedicada por negocio.
- Aislamiento en gateway y servicios operativos (productos, inventario, ventas, reportes): todavía pendiente.

## Decisiones registradas

- **UI “Negocio”, código `Business` / `businessId`** — coherencia con usuarios hispanohablantes y convención de carpetas en inglés (`tech-stack.md`).
- **Permisos y módulos globales; roles por negocio** — un solo árbol RBAC que mantener; personalización por negocio vía roles, no duplicando permisos.
- **Sin FK cross-schema** — alinea microservicios con PostgreSQL compartido o esquemas separados (`tech-stack.md`, sección 4).
- **Fase 2 de auth ya implementada** — el negocio no es implícito en este servicio; el JWT lleva `businessId`.
- **Patrón Propia Arepa con registro self-service** — entidad Negocio acotada; no se adopta tenant+company+superadmin en v2. Los negocios se crean con `POST /api/auth/register`; el `SUPER_ADMIN` ([004](../004-saas/spec.md)) es el único que puede desactivarlos.

## Documentos relacionados

- [Misión y alcance](../../constitution/mission.md)
- [Tecnologías y convenciones](../../constitution/tech-stack.md) — sección 4 enlaza a este spec.
- [001 · Autenticación y acceso por rol](../001-nombre-feature/spec.md)
- [002 · Catálogo de productos](../002-productos-catalogo/spec.md) — aislamiento por negocio antes de persistir catálogo
