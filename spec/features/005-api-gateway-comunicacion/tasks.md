# 005 · API Gateway y comunicación interna — Tareas

_Checklist accionable derivada del `plan.md`. Marcar `[x]` al completar._

## Precondiciones

- [x] 004 fase A implementada (`code` en errores).

## Fase A — Contrato y claves

### Workspaces

- [ ] `backend/package.json` raíz con workspaces.
- [ ] Un solo `backend/package-lock.json`; eliminar el de auth-service tras verificar `npm ci`.
- [ ] Dockerfile de auth-service con contexto `./backend` y tres etapas.
- [ ] `docker-compose.yml` con el nuevo contexto de build.
- [ ] README de auth-service: comandos de publicación en Docker Hub actualizados.

### `service-kit`

- [ ] Estructura del paquete (`contract/`, `auth/`, `http/`, `config/`) compilada a `dist/`.
- [ ] Mover guards, decoradores, interfaces del JWT y filtro de errores desde auth-service.
- [ ] `JwtStrategy` RS256, `InternalOnlyGuard`, `@InternalOnly()` y `verifyAccessToken`.
- [ ] `requestIdMiddleware`, `configureService(app)` y `ServiceKitModule.forRoot()`.
- [ ] `assertProductionKeys`, `internalApiKey` y `trustProxyHops`.
- [ ] Tests unitarios del paquete.

### RS256

- [ ] auth-service firma con `JWT_PRIVATE_KEY` y `kid`; se elimina `JWT_SECRET`.
- [ ] Script `generate-dev-keys.mjs` y `backend/.env.keys` en `.gitignore`.
- [ ] `.env.example` y `docker-compose.yml` con las variables nuevas, sin valores reales.
- [ ] Test: un token HS256 o firmado con otra clave responde `401`.

### Adopción en auth-service

- [ ] auth-service usa `service-kit` en lugar de sus guards, decoradores, estrategia y filtro.
- [ ] `trust proxy` según `TRUST_PROXY_HOPS`.
- [ ] E2E de auth-service en verde sin cambios de comportamiento.
- [ ] Marcar los criterios de la fase A en `spec.md`.

## Fase B — Gateway

### Servicio

- [ ] Crear `backend/api-gateway` (NestJS, puerto 3000, `bodyParser: false`) y sumarlo a los workspaces.
- [ ] Tabla de rutas con prefijo, servicio y si exige token.
- [ ] Middlewares en orden: request id → helmet/CORS → límite por IP → ruta → token → estado del negocio → saneamiento → proxy.
- [ ] Proxy en streaming con timeout y traducción de errores a `503`/`504`.
- [ ] `GET /api/health` agregado.
- [ ] Dockerfile de tres etapas con usuario sin privilegios y `HEALTHCHECK`.

### Red y exposición

- [ ] Solo el gateway publica puerto; auth-service usa `expose`.
- [ ] Variables del gateway y de auth-service (`TRUST_PROXY_HOPS=1`, `INTERNAL_API_KEY`) en compose y `.env.example`.
- [ ] Quitar CORS de auth-service.
- [ ] Documentar que Postgres no se publica en producción.

### Pruebas

- [ ] E2E con servicio stub: saneamiento de headers, `X-Request-Id`, `X-Forwarded-For`, rutas desconocidas e internas.
- [ ] E2E con auth-service real: `401` con token inválido, `403` cuando falta el permiso, login y refresh a través del gateway.
- [ ] E2E de límites por IP real.
- [ ] E2E de fallos: `503` y `504`.

### Negocios desactivados (requiere 004 fase B)

- [ ] `GET /api/internal/businesses/:id/status` en auth-service con `@InternalOnly()`.
- [ ] Caché de estado en el gateway con `BUSINESS_STATUS_CACHE_TTL`.
- [ ] E2E: desactivación aplicada en el gateway antes de que venza el TTL.
- [ ] Marcar los criterios de la fase B en `spec.md`.

## Fase C — Comunicación interna (con el primer servicio que llame a otro)

- [ ] Cliente HTTP interno en `service-kit` con reenvío de token, `X-Request-Id`, `X-Internal-Key`, `Idempotency-Key`, timeout y reintentos solo idempotentes.
- [ ] Utilidades y guía para la tabla `idempotency_keys` de cada servicio.
- [ ] Primera ruta interna real con e2e de aislamiento, idempotencia y timeout.
- [ ] Marcar los criterios de la fase C en `spec.md`.

## Cierre

- [ ] Actualizar `constitution/tech-stack.md` si alguna decisión cambió durante la implementación.
- [ ] Validar todos los criterios de aceptación de `spec.md`.
- [ ] Mover la feature a "Hecho" en `../../constitution/roadmap.md`.

## Mantenimiento (checklist recurrente)

- [ ] Al crear un servicio: sumarlo a los workspaces, usar `ServiceKitModule.forRoot()` y `configureService(app)`, no publicar su puerto y agregar su prefijo a la tabla de rutas del gateway.
- [ ] Al crear una ruta interna: ponerla bajo `/api/internal/**`, con `@InternalOnly()`; si tiene efectos, exigir `Idempotency-Key`.
- [ ] Nunca leer `businessId` del cuerpo, la query o un header: solo del token.
- [ ] La clave privada de JWT solo la recibe auth-service.
