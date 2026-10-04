# 002 · Catálogo de productos

**Estado:** propuesta (placeholder)

## Qué hace

Permite al negocio definir y mantener el **catálogo de productos**: identificadores comerciales, categorías, descripciones, precios y estado (activo/inactivo). Es la base sobre la que el inventario conoce qué ítems existen y las ventas qué puede venderse.

## Por qué

La misión de NexoStock exige un flujo productos–inventario–ventas coherente (`constitution/mission.md`). Sin catálogo estable no hay trazabilidad ni descuentos de existencias confiables. Esta feature se construye después de [001 · Autenticación y acceso por rol](../001-nombre-feature/spec.md) y antes o en paralelo con las specs de inventario y ventas.

## Aislamiento por negocio

Las reglas completas están en [003 · Aislamiento por Negocio](../003-negocio-aislamiento/spec.md). Como `auth-service` ya emite tokens con `businessId`, el escenario de "negocio único implícito" de la fase 1 ya no aplica: `products-service` nace multi-negocio.

- `business_id` NOT NULL en todas las tablas desde la primera migración, con índices compuestos donde aplique (p. ej. `UNIQUE (business_id, sku)`).
- **Toda** consulta y mutación filtra por el `businessId` del JWT. Las creaciones lo toman del token, nunca del cliente.
- Un producto de otro negocio responde `404`, aunque el UUID exista.
- Las funciones del servicio reciben `businessId` como parámetro obligatorio, para que olvidar el filtro no compile.

Las specs futuras de **inventario** y **ventas** deben repetir esta sección (o enlazar a 003) antes de persistir datos.

## Infraestructura común

`products-service` es el primer servicio operativo y debe nacer sobre lo definido en [005 · API Gateway y comunicación interna](../005-api-gateway-comunicacion/spec.md):

- usa `service-kit` para verificar el JWT (RS256), los permisos y el formato de errores;
- no publica puerto: se accede a través del gateway, que enruta `/api/products/**` y `/api/categories/**`;
- toda ruta exige un permiso de productos; el `SUPER_ADMIN` no los tiene, así que la plataforma no opera catálogos ([004](../004-administracion-plataforma/spec.md));
- los listados usan el formato de página común `{ items, total, page, pageSize }`.

## Criterios de aceptación

_Especificación incompleta: ampliar antes de implementar `products-service`. Los criterios finales deben alinearse con la misión (catálogo usable por inventario y ventas) y con la matriz de permisos de la feature 001._

- [ ] (stub) Un administrador de inventario o propietario puede crear, editar y desactivar productos según permisos de la feature 001.
- [ ] (stub) Los productos referenciados en inventario y ventas pertenecen al mismo negocio: mismo `businessId` del token (003).
- [ ] (stub) El `SUPER_ADMIN` recibe `403` en todas las rutas de productos y categorías (004).

## Fuera de alcance (borrador)

- Implementación de servicio y API en este entregable (solo spec).
- Variantes, combos y listas de precios por cliente (backlog).
- Sucursales o catálogos distintos bajo un mismo negocio (`constitution/mission.md`).

## Documentos relacionados

- [003 · Aislamiento por Negocio](../003-negocio-aislamiento/spec.md)
- [005 · API Gateway y comunicación interna](../005-api-gateway-comunicacion/spec.md)
- [001 · Autenticación y acceso por rol](../001-nombre-feature/spec.md)
- [Misión y alcance](../../constitution/mission.md)
