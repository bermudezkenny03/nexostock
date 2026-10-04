# 004 · Administración de plataforma

**Estado:** fase A implementada; fase B pendiente

## Qué hace

Agrega al **equipo de NexoStock** por encima de las tiendas, reutilizando el sistema de roles y permisos que ya existe. Los dueños siguen registrándose solos y administrando su tienda ([003](../003-negocio-aislamiento/spec.md)); el equipo de NexoStock, además, puede:

- ver y gestionar los negocios registrados, y activarlos o desactivarlos;
- gestionar los usuarios y roles de cualquier negocio con las mismas reglas que usa un dueño (por ejemplo, para ayudar a un dueño que perdió el acceso);
- consultar un registro de todo lo que hizo sobre cada negocio.

No es un sistema aparte: es el mismo `auth-service`, el mismo login y las mismas tablas. El equipo de NexoStock es un negocio más con un rol propio, `SUPER_ADMIN`.

La feature también corrige el arranque en producción: el catálogo de permisos solo lo creaba el seed, que no corre en producción, así que ahí fallaba el registro de negocios.

## Por qué

- **Nadie podía desactivar un negocio.** `is_active` existía, pero ningún rol por encima de las tiendas podía cambiarlo.
- **Un dueño podía quedarse fuera para siempre.** Sin sesión no hay forma de cambiar la contraseña, y nadie podía ayudarlo.
- **La plataforma no tenía visibilidad** sobre los negocios registrados.
- **El registro fallaba en producción** por el catálogo vacío.

## Modelo

| Concepto | En el código | Detalle |
| --- | --- | --- |
| Negocio del equipo | `PLATFORM_BUSINESS_ID`, nombre `NexoStock` | Una fila más de `businesses`, con un UUID fijo. No es una tienda |
| Rol del equipo | `SUPER_ADMIN` (Superadministrador) | Rol de sistema del negocio NexoStock |
| Permiso de plataforma | `platform.manage` (módulo `platform`) | Habilita las rutas `/api/platform/**` |
| Roles privilegiados | `OWNER`, `SUPER_ADMIN` | Solo quien tiene uno de ellos puede asignarlos o modificarlos |

El `SUPER_ADMIN` tiene los permisos de administración de un dueño (`users.manage`, `roles.manage`, `business.manage`, `modules.view`) más `platform.manage`. No tiene permisos de productos, inventario, ventas ni reportes: su negocio no es una tienda.

## Reglas

1. **`platform.manage` solo existe en roles del negocio NexoStock.** `RolesService` lo comprueba con el negocio del rol, no con quien lo otorga. Así, ni un dueño ni el propio `SUPER_ADMIN` actuando sobre una tienda pueden dárselo a un rol de tienda.
2. **Las tiendas no ven la plataforma.** `GET /api/modules` y `GET /api/permissions` solo muestran el módulo `platform` y `platform.manage` a usuarios del negocio NexoStock.
3. **Los roles privilegiados se protegen igual.** Las reglas que protegían al `OWNER` cubren también al `SUPER_ADMIN`: solo un rol privilegiado puede asignarlos o modificarlos, y ningún negocio se queda sin un usuario privilegiado activo.
4. **Las rutas de plataforma exigen dos cosas:** el permiso `platform.manage` y que el usuario pertenezca al negocio NexoStock.
5. **La plataforma no opera tiendas.** Gestiona negocios, usuarios y roles; nunca productos, inventario, ventas ni reportes.
6. **El negocio NexoStock no se gestiona por las rutas de plataforma.** Su equipo se administra con las rutas normales (`/api/users`, `/api/roles`, `/api/business/me`), y no se puede desactivar.
7. **Toda acción de plataforma sobre un negocio queda registrada** (fase B).

## Fase A — Cimientos (implementada)

- **`src/bootstrap.ts`** corre en cada arranque, también en producción, y es idempotente. Crea el catálogo de módulos y permisos, asegura el negocio NexoStock y sincroniza los roles de sistema de todos los negocios. Toma un advisory lock para que dos réplicas no choquen.
- **No crea usuarios**, salvo que reciba `SUPER_ADMIN_EMAIL` y `SUPER_ADMIN_PASSWORD`. En ese caso crea el `SUPER_ADMIN` si no existe y nunca sobrescribe una cuenta. En producción rechaza la contraseña de desarrollo.
- **El seed** (solo desarrollo) ejecuta el bootstrap y agrega `admin@nexostock.local` (`OWNER` del negocio demo) y `superadmin@nexostock.local` (`SUPER_ADMIN`).
- **Reglas 1 a 3** implementadas.
- **Errores con código:** las respuestas de error pueden traer un campo `code` estable. Primer código: `USER_INACTIVE`.
- **Sin cambios de esquema:** no hay migración.

## Fase B — Funciones de plataforma (pendiente)

### Rutas

Todas bajo `PlatformGuard` (regla 4). Antes de cada escritura se comprueba en la base que quien la pide siga activo y con `platform.manage`, porque el token no se revisa contra la base.

| Método y ruta | Qué hace |
| --- | --- |
| `GET /api/platform/businesses?search=&isActive=&page=&pageSize=` | Lista paginada de negocios (sin NexoStock): nombre, razón social, identificación tributaria, estado, dueños, cantidad de usuarios, fecha de alta y último ingreso |
| `POST /api/platform/businesses` | Crea un negocio con su dueño (reutiliza el registro) |
| `GET /api/platform/businesses/:businessId` | Detalle del negocio con sus dueños |
| `PATCH /api/platform/businesses/:businessId` | Edita los datos del negocio (reutiliza `BusinessService`) |
| `PATCH /api/platform/businesses/:businessId/status` | `{ isActive, reason }`: activa o desactiva; desactivar exige `reason` |
| `GET` `POST` `PATCH` `/api/platform/businesses/:businessId/users[/:id]` | Usuarios del negocio con las mismas reglas que `/api/users` |
| `GET` `POST` `PATCH` `DELETE` `/api/platform/businesses/:businessId/roles[/:id]` | Roles del negocio con las mismas reglas que `/api/roles` |
| `GET /api/platform/audit-logs?businessId=&page=&pageSize=` | Registro de acciones de plataforma |

### Reutilización

- `UsersService` y `RolesService` reciben el `businessId` como parámetro explícito. Las rutas de tienda les pasan el del token; las de plataforma, el de la URL.
- **Qué puede otorgar el `SUPER_ADMIN` en una tienda:** el catálogo de tienda (`BUSINESS_PERMISSION_CODES`), no lo que él tiene. La regla 1 sigue impidiendo `platform.manage`.
- **Recuperar el acceso de un dueño:** el `SUPER_ADMIN` le pone una contraseña nueva por `PATCH .../users/:id`. Eso revoca todas las sesiones del dueño, que debería cambiar la contraseña al entrar.

### Desactivar un negocio

- Cambia `is_active`, revoca los refresh tokens de todos sus usuarios y registra el motivo en la auditoría.
- El login responde `403` con `code: BUSINESS_INACTIVE` y el refresh responde `401`.
- **Ventana conocida:** un access token ya emitido sigue siendo válido hasta que caduca (`JWT_EXPIRES_IN`, 15 minutos por defecto). [005](../005-api-gateway-comunicacion/spec.md) puede reducirla.

### Auditoría

Tabla `platform_audit_logs` (única migración de la fase B):

```text
platform_audit_logs
  id UUID PK
  actor_user_id → users.id      ON DELETE RESTRICT
  business_id   → businesses.id ON DELETE RESTRICT
  action        TEXT NOT NULL   (business.created, business.updated, business.deactivated,
                                 business.activated, user.created, user.updated,
                                 role.created, role.updated, role.deleted)
  target_id     UUID NULL       (usuario o rol afectado; sin FK porque un rol puede borrarse)
  details       JSONB NULL      (campos cambiados y motivo; nunca contraseñas)
  created_at    TIMESTAMPTZ
  INDEX (business_id, created_at DESC)
  INDEX (created_at DESC)
```

El registro se escribe en cuanto la acción termina con éxito. Si no se puede escribir, la petición responde `500`; esa acción queda sin registro y el error aparece en el log del servidor.

## Criterios de aceptación

_Cada criterio se comprueba con sí/no. Marcar `[x]` al cumplirse._

### Fase A

- [x] Con `NODE_ENV=production` y sin seed, el arranque crea el catálogo y el negocio NexoStock, y `POST /api/auth/register` funciona.
- [x] El bootstrap es idempotente, incluso con dos ejecuciones simultáneas.
- [x] El `SUPER_ADMIN` tiene exactamente `users.manage`, `roles.manage`, `business.manage`, `modules.view` y `platform.manage`.
- [x] El `SUPER_ADMIN` solo ve los usuarios de su propio negocio en `/api/users`.
- [x] El `SUPER_ADMIN` puede crear roles de su equipo con `platform.manage`.
- [x] Un dueño no ve el módulo `platform` ni `platform.manage` en el catálogo.
- [x] Intentar dar `platform.manage` a un rol de tienda responde `403` con un mensaje específico.
- [x] El login de un usuario desactivado responde `code: USER_INACTIVE`.
- [x] El bootstrap no sobrescribe una cuenta existente y rechaza un email que pertenece a una tienda.

### Fase B

- [ ] Un usuario sin `platform.manage`, o con él pero fuera del negocio NexoStock, recibe `403` en `/api/platform/**`.
- [ ] El listado de negocios pagina, busca, filtra por estado y nunca incluye NexoStock.
- [ ] Operar sobre NexoStock por las rutas de plataforma responde `404`.
- [ ] Desactivar sin motivo responde `400`; con motivo, revoca las sesiones del negocio y deja registro.
- [ ] Con el negocio desactivado, el login responde `403 BUSINESS_INACTIVE` y el refresh `401`; al reactivar, vuelven a entrar.
- [ ] El `SUPER_ADMIN` gestiona usuarios y roles de una tienda con las mismas reglas que el dueño.
- [ ] En una tienda, el `SUPER_ADMIN` puede otorgar cualquier permiso de tienda, pero nunca `platform.manage`.
- [ ] Ponerle una contraseña nueva a un dueño revoca todas sus sesiones.
- [ ] Cada acción de plataforma deja un registro con actor, negocio, acción, objetivo y detalles, sin contraseñas.
- [ ] Un `SUPER_ADMIN` desactivado no puede ejecutar acciones de plataforma aunque su access token siga vigente.

## Fuera de alcance

- Operar productos, inventario, ventas o reportes de una tienda desde la plataforma.
- Entrar a una tienda como si fuera su dueño (suplantación).
- Recuperación de contraseña por correo sin intervención del equipo (requiere SMTP).
- MFA para el `SUPER_ADMIN`: recomendable más adelante, porque es la cuenta más sensible.
- Aprobación previa de los registros, facturación y planes.

## Decisiones

- **Reutilizar roles y permisos en vez de una capa nueva.** Se probó primero una columna `scope` en cinco tablas, con FKs compuestas y un claim `accessScope`. Se descartó: la separación ya se logra con un permiso, una regla central en `RolesService` y tests, sin migración ni conceptos nuevos.
- **El equipo vive en un negocio con UUID fijo**, en vez de un flag en `users` (obligaría a volver opcional `business_id`) o una tabla aparte (duplicaría login, refresh y cambio de contraseña).
- **Un solo permiso, `platform.manage`.** Alcanza para el MVP; se puede dividir cuando haga falta un rol de soporte con menos poder.
- **Mínimo privilegio para el `SUPER_ADMIN`.** Sin permisos de operación de tienda.
- **La regla de `platform.manage` mira el negocio del rol, no a quien otorga.** Cierra el hueco de que el `SUPER_ADMIN`, que sí lo tiene, se lo dé a un rol de tienda.
- **Contraseña puesta por el `SUPER_ADMIN` en vez de enlace de un solo uso.** Reutiliza `PATCH users` sin tablas nuevas. A cambio, el admin conoce la contraseña un momento.
- **`is_active` sigue siendo booleano.** El motivo de una desactivación vive en la auditoría.

## Documentos relacionados

- [003 · Aislamiento por Negocio](../003-negocio-aislamiento/spec.md)
- [005 · API Gateway y comunicación interna](../005-api-gateway-comunicacion/spec.md)
- [001 · Autenticación y acceso por rol](../001-nombre-feature/spec.md)
- `backend/auth-service/README.md`
