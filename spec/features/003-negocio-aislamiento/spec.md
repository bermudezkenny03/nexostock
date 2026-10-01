# 003 · Aislamiento por Negocio (multi-tenant lógico)

**Estado:** en progreso (auth-service fase 2 implementado; gateway y servicios operativos pendientes)

## Qué hace

Define cómo NexoStock separa los datos y las operaciones de **cada negocio** (cliente del producto) sin convertir la plataforma en un SaaS multi-empresa completo desde el MVP. Cada negocio tiene su propio catálogo operativo, usuarios, roles y ventas; ningún usuario autenticado puede leer ni modificar registros de otro negocio.

En la interfaz se habla de **Negocio**; en código, APIs, base de datos y tokens se usa **Business** y **`businessId`**.

## Por qué

La misión apunta a pequeños y medianos negocios que operan de forma independiente (`constitution/mission.md`). Aunque el MVP puede desplegarse para un solo cliente, el diseño debe permitir alojar varios negocios en la misma instancia sin mezclar información comercial ni credenciales. Este documento fija las reglas antes de que productos, inventario y ventas persistan datos masivos difíciles de migrar.

El patrón de referencia es el de **Propia Arepa** y proyectos similares: una entidad **Negocio** como frontera de datos, usuarios pertenecientes a un negocio y roles definidos **por negocio**, con catálogo global de módulos y permisos. **No** se adopta de entrada el modelo SaaS clásico (tenant + company + superadmin de plataforma + onboarding público); eso queda como fase opcional.

## Terminología

| Término (UI / docs) | Código / persistencia | Significado |
| --- | --- | --- |
| Negocio | `Business`, tabla `businesses` | Unidad de aislamiento: tienda, papelería, etc. |
| Identificador del negocio | `businessId` (UUID) | Clave foránea en tablas operativas y en el JWT |
| Catálogo de permisos | `modules`, `permissions` | Global a la plataforma; mismo árbol para todos los negocios |
| Rol | `roles` con alcance por negocio | Conjunto de permisos **dentro de un negocio** |
| Usuario | `users` | Persona con credenciales; en fase 2 pertenece a **un** negocio |
| Negocio implícito | (sin fila en BD en fase 1) | Estado actual del MVP: un solo negocio asumido |

## Fases de evolución

### Fase 1 — MVP (negocio único implícito)

**Alcance:** documentación y convenciones; **sin** cambios obligatorios en esquema ni código.

- Se asume **exactamente un negocio** por despliegue o demostración académica.
- No existe tabla `businesses` ni columna `businessId` en el `auth-service` actual.
- Los demás servicios, cuando persistan datos, deben diseñarse ya pensando en añadir `businessId` en fase 2 (columna nullable o migración planificada), pero no es requisito del MVP si aún no hay persistencia operativa.
- La feature [001 · Autenticación y acceso por rol](../001-nombre-feature/spec.md) sigue válida: roles globales en seed, un solo “mundo” de datos.

**Objetivo:** entregar flujo productos–inventario–ventas sin bloquearse en multi-tenant; este spec evita decisiones contradictorias en fase 1.

### Fase 2 — Multi-negocio (v2, activación explícita del equipo)

**Alcance:** aislamiento **obligatorio** en auth y en todas las tablas operativas.

1. **Auth (`auth-service`, esquema propio)**
   - Tabla `businesses` (nombre comercial, identificadores legales opcionales, `isActive`, marcas de tiempo).
   - Columna `users.business_id` NOT NULL (FK a `businesses`).
   - Tabla `roles`: deja de ser global única por `code`; pasa a **`@@unique([businessId, code])`**. Los roles de sistema (`isSystem`) se **siembran por negocio** (propietario, administrador de inventario, empleado de ventas), no una sola fila global.
   - `modules` y `permissions`: **sin** `businessId`; catálogo único.
   - `user_roles` y `role_permissions`: siguen enlazando usuario ↔ rol ↔ permiso; el rol ya está acotado al negocio del usuario.
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
- Onboarding self-service, facturación por tenant, subdominios por negocio: fuera de alcance hasta nueva spec.

## Estado actual del auth-service (línea base fase 1)

El esquema Prisma vigente define `User` sin `businessId`, `Role.code` único global y catálogo `Module` / `Permission` global. El JWT transporta `sub`, `email`, `roles` y `permissions` sin `businessId`. Cualquier implementación de fase 2 parte de esta línea base y requiere migraciones y actualización de emisión/validación de tokens.

## Cambios de esquema previstos (fase 2, auth)

Resumen orientativo (detalle en `plan.md` al activar v2):

```text
businesses
  id, name, legal_name?, tax_id?, is_active, created_at, updated_at

users
  + business_id → businesses.id (NOT NULL)

roles
  + business_id → businesses.id (NOT NULL)
  - @@unique([code])
  + @@unique([businessId, code])

modules, permissions
  (sin cambios de alcance)

user_roles, role_permissions, refresh_tokens, user_details
  (sin business_id directo; aislamiento vía user → business y role → business)
```

Reglas adicionales:

- Un usuario solo puede asignarse roles cuyo `businessId` coincida con el suyo.
- El propietario gestiona usuarios **solo de su negocio**; no puede ver emails de otros negocios.
- Desactivar un negocio (`businesses.isActive = false`) impide login de sus usuarios (comportamiento a especificar en criterios de aceptación).

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
| Onboarding | Propietario crea usuarios (001) | Registro público, invitaciones |
| FK entre microservicios | No; UUID + filtro `businessId` | Igual en muchos diseños distribuidos |
| Sucursales | Fuera de alcance (misión) | A veces “sites” bajo tenant |

NexoStock prioriza **simplicidad académica y PYMES** sobre elasticidad de plataforma; la fase 3 cierra brechas solo si el producto evoluciona hacia hosting multi-cliente gestionado.

## Criterios de aceptación (fase 2)

_Cada criterio se comprueba con sí/no. Marcar `[x]` al cumplirse cuando el equipo active v2._

### Negocio y usuarios

- [ ] Existe al menos un registro en `businesses` y todo usuario activo tiene `businessId` válido.
- [ ] Un propietario autenticado solo lista, crea, edita y desactiva usuarios de su negocio.
- [ ] No es posible asignar a un usuario un rol cuyo `businessId` difiera del suyo.
- [ ] Con un negocio desactivado, sus usuarios no pueden iniciar sesión.

### JWT y gateway

- [ ] Tras login, el access token incluye `businessId` coherente con la base de datos.
- [ ] Una solicitud con token válido de otro negocio no puede leer ni modificar recursos operativos ajenos aunque conozca el UUID del recurso.
- [ ] El cliente no puede sustituir el negocio enviando otro `businessId` en el cuerpo o query en operaciones normales.

### Roles y permisos

- [ ] Los códigos de rol (`OWNER`, etc.) pueden repetirse en distintos negocios pero son únicos dentro del mismo negocio.
- [ ] El catálogo de módulos y permisos es idéntico para todos los negocios; los cambios de permisos del rol afectan solo al negocio del rol editado.
- [ ] La matriz de permisos de la feature 001 se cumple **dentro de cada negocio**.

### Datos operativos

- [ ] Productos, inventario, ventas y reportes solo exponen datos con el `businessId` del token.
- [ ] Referencias cruzadas entre servicios rechazan pares (`businessId`, `productId`) inconsistentes.

### Migración

- [ ] Un entorno fase 1 migrado conserva usuarios y roles equivalentes bajo el negocio por defecto.
- [ ] Tras migración, es necesario volver a autenticarse para obtener tokens con `businessId`.

## Fuera de alcance

- Fase 1: implementación de tabla `businesses` o filtros por `businessId`.
- Sucursales o almacenes múltiples bajo un mismo negocio (`constitution/mission.md`).
- Facturación, límites por plan o cuotas por negocio.
- Fase 3 completa (M:N usuario–negocio, superadmin) salvo spec futura.
- Replicación geográfica o base de datos dedicada por negocio.
- Cambios de código en este entregable: **solo documentación**.

## Decisiones registradas

- **UI “Negocio”, código `Business` / `businessId`** — coherencia con usuarios hispanohablantes y convención de carpetas en inglés (`tech-stack.md`).
- **Permisos y módulos globales; roles por negocio** — un solo árbol RBAC que mantener; personalización por negocio vía roles, no duplicando permisos.
- **Sin FK cross-schema** — alinea microservicios con PostgreSQL compartido o esquemas separados (`tech-stack.md`, sección 4).
- **Negocio implícito en MVP** — no retrasar entrega académica; fase 2 activada cuando haya segundo cliente o requisito de hosting compartido.
- **Patrón Propia Arepa** — entidad Negocio acotada; no adoptar tenant+company+superadmin en v2.

## Documentos relacionados

- [Misión y alcance](../../constitution/mission.md)
- [Tecnologías y convenciones](../../constitution/tech-stack.md) — sección 4 enlaza a este spec.
- [001 · Autenticación y acceso por rol](../001-nombre-feature/spec.md)
- [002 · Catálogo de productos](../002-productos-catalogo/spec.md) — aislamiento por negocio antes de persistir catálogo
