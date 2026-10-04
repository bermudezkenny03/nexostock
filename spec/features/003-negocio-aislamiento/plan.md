# 003 · Aislamiento por Negocio — Plan

_Cómo se implementa la fase 2 descrita en `spec.md` cuando el equipo active v2. Debe respetar la `constitution/` y el patrón Negocio (Propia Arepa), no el SaaS multi-tenant completo._

## Enfoque

Introducir **`businessId` como eje transversal**: primero en auth (fuente de verdad del contexto de negocio y del JWT), luego en cada servicio operativo con la misma regla de filtrado. El catálogo RBAC global (`modules`, `permissions`) se mantiene; solo **roles** y **usuarios** ganan alcance por negocio. Las migraciones parten de un **negocio por defecto** para no romper entornos MVP ya poblados.

La fase 1 no ejecuta este plan; sirve como orden acordado para evitar implementar servicios operativos sin columna `business_id` “porque aún no se usa”.

## Precondiciones (activación v2)

- Feature [001](../001-nombre-feature/spec.md) estable en auth (login, roles, permisos).
- Equipo alinea fecha de ventana para invalidar tokens sin `businessId`.
- Contratos OpenAPI o DTOs documentados para propagación de contexto en gateway.

## Implementación

_Pasos en orden. Ajustar rutas concretas al estado del repositorio en el momento de la activación._

### 1. Auth — modelo y migración

1. `backend/auth-service/prisma/schema.prisma` — modelos `Business`, `User.businessId`, `Role.businessId`, `@@unique([businessId, code])` en roles.
2. Migración SQL Prisma — crear `businesses`, columnas, FKs, backfill negocio por defecto, remapeo de `user_roles` (ver `spec.md`, migración).
3. `prisma/seed.ts` — catálogo global + bucle por negocio para roles de sistema y permisos.
4. Servicios y DTOs de usuarios/roles — filtrar por `businessId` del solicitante; prohibir cruce de negocios en asignación de roles.
5. Entidad `Business` mínima (nombre, estado) si el propietario debe ver/editar datos del negocio en v2.

### 2. Auth — JWT y perfil

1. `src/common/interfaces/jwt-payload.interface.ts` — añadir `businessId: string`.
2. `src/auth/auth.service.ts` — incluir `businessId` al firmar access token; perfil/login response con negocio.
3. `src/auth/interfaces/auth-user.interface.ts` y entidades de respuesta — exponer `businessId` (y opcionalmente nombre del negocio).
4. Guards y `AccessService` — cargar usuario con negocio activo; rechazar login si `business.isActive === false`.
5. Pruebas e2e auth — dos negocios, dos usuarios, aislamiento de listados de usuarios.

### 3. API Gateway

Se diseña en [005 · API Gateway y comunicación interna](../005-api-gateway-comunicacion/plan.md). Resumen de lo que afecta a esta feature:

1. El gateway verifica el JWT y aplica el ámbito por ruta antes de reenviar.
2. Reenvía el mismo `Authorization`; **no** existe un header `X-Business-Id`. Cada servicio vuelve a verificar el token y toma de ahí el `businessId`.
3. El contrato de contexto de negocio queda documentado en 005 y en `constitution/tech-stack.md`.

### 4. Servicios operativos (orden sugerido)

1. **products-service** — esquema/migraciones con `business_id`; middleware de contexto; CRUD filtrado.
2. **inventory-service** — idem; validación de producto en el mismo negocio antes de movimientos.
3. **sales-service** — idem; coordinación con inventario pasando `businessId`.
4. **reports-service** — consultas agregadas con filtro obligatorio.

Para cada servicio: índices `(business_id, …)`, pruebas de “UUID válido pero otro negocio → 404”, y revisión de que ningún endpoint acepta `businessId` del body como fuente de verdad.

### 5. Frontend

1. Pinia / sesión — almacenar `businessId` y nombre del negocio desde login.
2. Copy UI — etiquetas “Negocio” donde corresponda (configuración, cabecera).
3. Sin selector de negocio en v2 (reservado a fase 3).

### 6. Migración y despliegue

1. Script o migración documentada para entornos existentes (negocio por defecto).
2. Comunicar re-login obligatorio post-despliegue.
3. Actualizar `.env.example` si aparecen variables de seed de negocio demo.

### 7. Documentación y cierre

1. Marcar criterios de aceptación en `spec.md`.
2. Actualizar `constitution/roadmap.md` y referencias en otras features que asuman negocio único.
3. Registrar en `tech-stack.md` decisiones finales si difieren de la propuesta.

## Decisiones

- **Un usuario ↔ un negocio en v2** — evita complejidad de sesión; fase 3 introduce M:N si hace falta.
- **404 ante recurso de otro negocio** — reduce fuga de existencia entre tenants lógicos; unificar con gateway si el equipo prefiere 403 en admin.
- **Roles clonados por negocio en seed** — más simple que roles “plantilla” referenciados; duplicación acotada a tres roles de sistema.
- **Sin superadmin en v2; la plataforma llega con 004** — los negocios nuevos se crean con el registro público `POST /api/auth/register` (que se puede desactivar con `REGISTRATION_ENABLED=false`). La suspensión de negocios y la recuperación de acceso de los dueños se definen en [004](../004-administracion-plataforma/spec.md).
- **Sin header de negocio entre servicios** — el contexto viaja solo dentro del JWT firmado ([005](../005-api-gateway-comunicacion/spec.md)); un header aparte sería un valor más que alguien podría falsificar.

## Riesgos

- **Orden incorrecto de migración de roles** — usuarios quedan sin rol; mitigar con transacción única y script de verificación post-migración.
- **Servicios desplegados sin filtro** — fuga cross-negocio; mitigar con checklist en `tasks.md` y prueba e2e multi-negocio en CI cuando exista.
- **Tokens antiguos sin `businessId`** — servicios estrictos rechazan requests; mitigar con ventana de mantenimiento y revocación de refresh tokens.
- **Duplicación de SKU entre negocios** — deseable; asegurar unicidad `(business_id, sku)` no global `sku`.
