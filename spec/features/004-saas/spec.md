# 004 · NexoStock como SaaS

**Estado:** implementada en `auth-service` (pendiente de commit)

## Qué hace

Convierte a NexoStock en un SaaS completo sobre lo que ya existía: las tiendas siguen registrándose solas y administrando a su equipo ([003](../003-negocio-aislamiento/spec.md)), y ahora además:

- **Planes:** cada tienda tiene un plan (Gratis, Básico o Pro) que limita sus usuarios activos. Toda tienda nueva empieza en Gratis.
- **Proveedor:** el equipo de NexoStock es un negocio más con el rol `SUPER_ADMIN`.
- **Panel de plataforma:** el `SUPER_ADMIN` ve las tiendas, las activa o desactiva, les cambia el plan y restablece la contraseña de un dueño que perdió el acceso.

También corrige el arranque en producción: el catálogo de permisos solo lo creaba el seed, que no corre en producción, así que el registro de tiendas fallaba ahí.

## Por qué

Un SaaS necesita, además de que cada cliente tenga sus datos aislados, una forma de ofrecer planes y un proveedor que pueda supervisar a sus clientes. Sin eso, nadie puede suspender una tienda, ayudar a un dueño bloqueado ni limitar lo que usa cada cliente.

## Reglas

1. **Planes:** son datos de referencia de la tabla `plans`, creados por migración. Un límite `NULL` significa sin límite.
2. **Permisos por plan:** Gratis incluye productos, inventario, ventas, usuarios y datos del negocio. Básico agrega roles personalizados y ver dashboard y reportes. Pro incluye todo. Los permisos efectivos de un usuario son los de su rol que su plan permite; se calculan al iniciar sesión y al renovar el token. El catálogo de cada tienda solo muestra lo de su plan. Listar roles también se permite con `users.manage`, para poder asignarlos sin roles personalizados.
3. **Límite de usuarios:** crear o reactivar un usuario falla con `403 PLAN_LIMIT_REACHED` si la tienda ya tiene los usuarios activos de su plan. Se comprueba con la fila del negocio bloqueada.
4. **Bajar de plan no desactiva a nadie:** solo impide agregar o reactivar usuarios hasta quedar dentro del límite.
5. **Proveedor:** negocio `NexoStock` con UUID fijo, plan Pro y rol `SUPER_ADMIN` (`users.manage`, `roles.manage`, `business.manage`, `modules.view`, `platform.manage`). No tiene permisos de tienda.
6. **`platform.manage` solo existe en roles del negocio NexoStock.** Lo decide el negocio del rol, no quien lo otorga.
7. **Las tiendas no ven la plataforma** en el catálogo de módulos y permisos.
8. **Roles privilegiados:** las protecciones del `OWNER` también cubren al `SUPER_ADMIN`.
9. **Panel:** exige `platform.manage` y pertenecer al negocio NexoStock. Las escrituras vuelven a comprobar en la base que el actor siga activo. El negocio NexoStock responde `404` en estas rutas.
10. **Desactivar una tienda** cierra todas sus sesiones; el login responde `403 BUSINESS_INACTIVE`. Un access token ya emitido sigue válido hasta que caduca (15 minutos por defecto).
11. **Bootstrap:** corre en cada arranque, también en producción, y es idempotente. Se detiene si un plan de la base no tiene sus permisos en `PLAN_PERMISSIONS`, o al revés. Solo crea el `SUPER_ADMIN` si recibe `SUPER_ADMIN_EMAIL` y `SUPER_ADMIN_PASSWORD`.
12. **Auditoría:** cada acción del panel que cambia algo se guarda en `platform_audit_logs`, en la misma transacción que la acción, con actor, tienda, usuario afectado y detalles; nunca contraseñas. Una acción que no cambia nada no se registra.

## API nueva

| Método | Ruta | Qué hace |
| --- | --- | --- |
| `GET` | `/api/platform/plans` | Planes |
| `GET` | `/api/platform/businesses` | Tiendas paginadas, con búsqueda y filtros por estado y plan |
| `GET` | `/api/platform/businesses/:businessId` | Detalle de una tienda |
| `PATCH` | `/api/platform/businesses/:businessId/status` | Activar o desactivar |
| `PATCH` | `/api/platform/businesses/:businessId/plan` | Cambiar de plan |
| `POST` | `/api/platform/businesses/:businessId/owners/:userId/password` | Nueva contraseña para un dueño |
| `GET` | `/api/platform/audit-logs` | Registro de acciones de plataforma, filtrable por tienda |

`GET /api/business/me` agrega `plan` y `activeUsers`. Los errores agregan un campo `code` opcional.

## Criterios de aceptación

- [x] Con `NODE_ENV=production` y sin seed, el arranque crea el catálogo y el negocio NexoStock, y el registro funciona.
- [x] Una tienda nueva queda en el plan Gratis.
- [x] Cada plan entrega exactamente sus permisos en el token y en el catálogo; al subir de plan, los nuevos llegan en el siguiente refresh.
- [x] Crear o reactivar un usuario por encima del límite responde `403 PLAN_LIMIT_REACHED`; al subir de plan, se permite.
- [x] Solo el equipo de NexoStock entra a `/api/platform/**`; un dueño recibe `403`.
- [x] El listado nunca incluye el negocio NexoStock, y operar sobre él responde `404`.
- [x] Desactivar una tienda impide el login (`BUSINESS_INACTIVE`) y el refresh; al reactivar, vuelven a entrar.
- [x] Restablecer la contraseña de un dueño cierra sus sesiones; un usuario que no es dueño responde `404`.
- [x] Dar `platform.manage` a un rol de tienda responde `403` con un mensaje específico.
- [x] Un usuario del equipo desactivado no puede hacer cambios aunque su access token siga vigente.
- [x] El bootstrap es idempotente, incluso con dos ejecuciones simultáneas.
- [x] El bootstrap no arranca si un plan no tiene permisos configurados.
- [x] Cada acción del panel queda en la auditoría con sus detalles, y repetir una acción sin cambios no la registra.

## Fuera de alcance

- Pasarela de pago o cobro automático (la misión lo excluye): el plan lo cambia el `SUPER_ADMIN`.
- Periodo de prueba y vencimiento de suscripciones.
- Obligar al dueño a cambiar la contraseña que le puso el `SUPER_ADMIN`.
- Gestionar desde el panel los usuarios, roles o datos operativos de una tienda.
- Aplicar el límite de productos: lo hará `products-service`.

## Documentos relacionados

- [003 · Aislamiento por Negocio](../003-negocio-aislamiento/spec.md)
- `backend/auth-service/README.md`, secciones "SaaS: planes y equipo de NexoStock" y "Bootstrap"
