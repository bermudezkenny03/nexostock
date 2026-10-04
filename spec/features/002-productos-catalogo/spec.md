# 002 · Catálogo de productos

**Estado:** propuesta (placeholder)

## Qué hace

Permite al negocio definir y mantener el **catálogo de productos**: identificadores comerciales, categorías, descripciones, precios y estado (activo/inactivo). Es la base sobre la que el inventario conoce qué ítems existen y las ventas qué puede venderse.

## Por qué

La misión de NexoStock exige un flujo productos–inventario–ventas coherente (`constitution/mission.md`). Sin catálogo estable no hay trazabilidad ni descuentos de existencias confiables. Esta feature se construye después de [001 · Autenticación y acceso por rol](../001-nombre-feature/spec.md) y antes o en paralelo con las specs de inventario y ventas.

## Aislamiento por negocio

Las reglas completas están en [003 · Aislamiento por Negocio](../003-negocio-aislamiento/spec.md). Resumen para persistencia en `products-service`:

**Fase 1 (MVP):** se asume un **negocio único implícito** por despliegue. No es obligatorio tener columna `business_id` en la primera migración si el equipo entrega el MVP sin multi-tenant, pero **toda tabla nueva** de productos o categorías **debe** incluir `business_id` nullable **o** documentar en el plan de migración la columna prevista para v2 (backfill con un UUID de negocio por defecto).

**Fase 2 (v2):** `business_id` NOT NULL en tablas operativas; **toda** consulta y mutación filtra por el `businessId` del JWT. Las creaciones fijan `business_id` desde el contexto del token, no desde el cliente. Índices compuestos donde aplique (p. ej. `(business_id, sku)`).

Las specs futuras de **inventario** y **ventas** deben repetir esta sección (o enlazar a 003) antes de persistir datos masivos.

## Criterios de aceptación

_Especificación incompleta: ampliar antes de implementar `products-service`. Los criterios finales deben alinearse con la misión (catálogo usable por inventario y ventas) y con la matriz de permisos de la feature 001._

- [ ] (stub) Un administrador de inventario o propietario puede crear, editar y desactivar productos según permisos de la feature 001.
- [ ] (stub) Los productos referenciados en inventario y ventas pertenecen al mismo ámbito de negocio definido en 003 (fase 2: mismo `businessId` del token).

## Fuera de alcance (borrador)

- Implementación de servicio y API en este entregable (solo spec).
- Variantes, combos y listas de precios por cliente (backlog).
- Sucursales o catálogos distintos bajo un mismo negocio (`constitution/mission.md`).

## Documentos relacionados

- [003 · Aislamiento por Negocio](../003-negocio-aislamiento/spec.md)
- [001 · Autenticación y acceso por rol](../001-nombre-feature/spec.md)
- [Misión y alcance](../../constitution/mission.md)
