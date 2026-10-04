# 005 · API Gateway y comunicación interna — Plan

_Cómo se implementa lo descrito en `spec.md`. Debe respetar la `constitution/` y las reglas de [003](../003-negocio-aislamiento/spec.md) y [004](../004-administracion-plataforma/spec.md)._

## Enfoque

Tres fases, en orden:

- **Fase A — Contrato y claves:** RS256 en auth-service, paquete `service-kit` y adopción en auth-service, `trust proxy`. Va antes del gateway y de cualquier servicio operativo.
- **Fase B — Gateway:** el servicio `api-gateway`, el chequeo de suspensión y el cambio de `docker-compose.yml` para que solo el gateway quede expuesto.
- **Fase C — Comunicación interna:** cliente HTTP interno e idempotencia. Se implementa junto con el primer par de servicios que se llamen entre sí (ventas con inventario y productos), no antes.

## Precondiciones

- [004](../004-administracion-plataforma/spec.md) fase A implementada: claim `accessScope`, `ScopeGuard` y campo `code` en errores.
- Para el chequeo de suspensión (B4): 004 fase B implementada (`businesses.status`).

## Implementación — Fase A

### A1. Workspaces

1. `backend/package.json` — raíz con `"private": true` y `"workspaces": ["packages/*", "auth-service", "api-gateway"]`; los servicios nuevos se agregan al crearse.
2. Un solo `backend/package-lock.json`; se elimina el de `auth-service` después de verificar que `npm ci` en la raíz instala lo mismo.
3. Dockerfiles con contexto `./backend`: copian `package.json`, `package-lock.json`, `packages/service-kit` y su propio servicio, y luego `npm ci -w <servicio> -w packages/service-kit`. Se mantiene el patrón de tres etapas actual (`builder`, `prod-deps`, `production`).
4. `docker-compose.yml` — `build.context: ./backend` y `dockerfile: auth-service/Dockerfile`.
5. README de auth-service — actualizar los comandos `docker build` de publicación en Docker Hub al nuevo contexto.

### A2. `service-kit`

`backend/packages/service-kit/` (TypeScript, compilado a `dist/`, sin dependencias de Prisma):

1. `contract/` — `JwtPayload`, `parseJwtPayload`, `AccessScope`, `HEADERS`, `ERROR_CODES`, `Page<T>`.
2. `auth/` — mover desde auth-service: `JwtAuthGuard`, `PermissionsGuard`, `ScopeGuard` (de 004), `@Public`, `@RequirePermissions`, `@CurrentUser`, `@PlatformOnly`, `@AnyScope`. Agregar `JwtStrategy` RS256 configurada por entorno, `InternalOnlyGuard` + `@InternalOnly()` y `verifyAccessToken(token)` como función pura para el gateway.
3. `http/` — mover `HttpExceptionFilter`; agregar `requestIdMiddleware`, `configureService(app)` y `ServiceKitModule.forRoot()`, que registra los guards globales en orden: sesión → ámbito → permisos.
4. `config/` — `loadPublicKey()`, `assertProductionKeys()` (clave presente, RSA de al menos 2048 bits), `internalApiKey()` con rechazo de valores de ejemplo en producción, `trustProxyHops()`.
5. Tests unitarios del paquete: parseo del payload, guards, verificación con clave correcta e incorrecta y saneamiento del `X-Request-Id`.

### A3. RS256 en auth-service

1. `src/common/common.module.ts` — `JwtModule` con `privateKey`, `publicKey`, `signOptions: { algorithm: 'RS256', keyid }`.
2. `src/common/config/jwt.config.ts` — `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `JWT_KEY_ID`; se elimina `JWT_SECRET` y `assertProductionJwtSecret` pasa a `assertProductionKeys` de `service-kit`. Las claves se aceptan en PEM o en base64 (para caber en una variable de entorno).
3. `backend/scripts/generate-dev-keys.mjs` — genera un par RSA de 2048 bits con `node:crypto` y escribe las variables en `backend/.env.keys` (en `.gitignore`).
4. `.env.example` y `docker-compose.yml` — variables nuevas, sin valores reales.

### A4. auth-service sobre `service-kit`

1. Reemplazar los guards, decoradores, estrategia, interfaces y filtro locales por los de `service-kit`.
2. `src/main.ts` — `configureService(app)`; `trust proxy` según `TRUST_PROXY_HOPS` (0 por defecto, 1 detrás del gateway).
3. Correr todos los e2e de auth-service sin cambios de comportamiento.

## Implementación — Fase B

### B1. Servicio `api-gateway`

`backend/api-gateway/` (NestJS, puerto 3000, `bodyParser: false` para reenviar el cuerpo sin leerlo):

1. `src/routes.ts` — tabla de rutas de la spec: prefijo, URL del servicio (`AUTH_SERVICE_URL`, …), si exige token y ámbito.
2. Middlewares, en este orden:
   1. `requestId` (de `service-kit`);
   2. `helmet` y CORS (`CORS_ORIGINS`);
   3. límite global por IP con `express-rate-limit` (`GATEWAY_RATE_LIMIT`, `GATEWAY_RATE_WINDOW`);
   4. resolución de ruta (`404 ROUTE_NOT_FOUND` si no hay coincidencia o si es `/api/internal/**`);
   5. autenticación con `verifyAccessToken` cuando la ruta lo exige (`401 UNAUTHENTICATED`);
   6. ámbito (`403 SCOPE_FORBIDDEN`);
   7. estado del negocio (B4);
   8. saneamiento de headers y escritura de `X-Forwarded-For`;
   9. proxy.
3. Proxy con `http-proxy-middleware` en modo streaming, timeout `UPSTREAM_TIMEOUT_MS` (10 s por defecto), sin reintentos.
4. Errores del proxy → `503 UPSTREAM_UNAVAILABLE` o `504 UPSTREAM_TIMEOUT` con la forma común.
5. `GET /api/health` — consulta `/api/health` de cada servicio con timeout corto y responde `{ status: 'ok' | 'degraded', services: { … } }`.
6. `Dockerfile` con el mismo patrón de tres etapas, usuario sin privilegios y `HEALTHCHECK`.

### B2. Red y exposición

1. `docker-compose.yml` — servicio `api-gateway` con `ports: ["3000:3000"]`; `auth-service` pasa de `ports` a `expose: ["3001"]`.
2. `auth-service`: `TRUST_PROXY_HOPS=1` y `INTERNAL_API_KEY`; el gateway recibe `JWT_PUBLIC_KEY`, `INTERNAL_API_KEY`, URLs de servicios y `CORS_ORIGINS`.
3. CORS sale de auth-service: ningún servicio detrás del gateway habilita CORS.
4. Postgres sigue publicando `5432` solo para desarrollo local; documentar que en producción no se publica.

### B3. Pruebas del gateway

1. E2E del gateway con un servicio de prueba (stub HTTP) que devuelve los headers recibidos: saneamiento, `X-Request-Id`, `X-Forwarded-For`, rutas desconocidas e internas.
2. E2E contra auth-service real: `401`, `403 SCOPE_FORBIDDEN` en ambos sentidos, login y refresh a través del gateway.
3. E2E de límites: dos IPs distintas tienen límites de login independientes.
4. Fallos: servicio caído → `503`; servicio lento → `504`.

### B4. Chequeo de suspensión (requiere 004 fase B)

1. auth-service: `GET /api/internal/businesses/:id/status` con `@Public()` + `@InternalOnly()`, que responde `{ status }` y `404` si no existe.
2. Gateway: caché en memoria por `businessId` con TTL `BUSINESS_STATUS_CACHE_TTL` (30 s); solo para tokens `BUSINESS` y fuera de `/api/auth/**`; si auth-service falla y no hay caché, deja pasar y registra una advertencia.
3. E2E: suspender desde la plataforma y verificar el `403 BUSINESS_SUSPENDED` en el gateway antes de que venza el TTL.

## Implementación — Fase C

_Se hace al construir el primer servicio que llame a otro._

1. `service-kit/http/internal-client.ts` — cliente sobre `fetch` que agrega `Authorization` (reenviado), `X-Request-Id`, `X-Internal-Key` e `Idempotency-Key`; timeout de 5 s; reintentos solo para operaciones idempotentes; traduce errores a excepciones tipadas.
2. `service-kit/idempotency/` — guía y utilidades para la tabla `idempotency_keys` de cada servicio (`business_id`, `key`, `request_hash`, `response`, `created_at`, `UNIQUE (business_id, key)`). Cada servicio la crea en su propio esquema; no hay tabla compartida.
3. Primera ruta interna real (por ejemplo, descuento de inventario por venta) con sus e2e: aislamiento por negocio, idempotencia y timeout.

## Decisiones

- **El gateway usa middlewares de Express, no guards de Nest.** El proxy no pasa por controladores, así que los guards no se ejecutarían. Por eso `service-kit` expone funciones puras de verificación además de los guards.
- **`bodyParser: false` en el gateway.** El cuerpo se reenvía en streaming sin leerlo ni volver a serializarlo.
- **Caché de estado en memoria por instancia.** Basta para una o pocas réplicas; un caché compartido (Redis) queda para cuando haya varias réplicas y la ventana importe más.
- **Fase C diferida.** No hay llamadas internas hasta que existan ventas e inventario; construir el cliente antes sería diseñarlo sin un caso real.
- **Una tabla de idempotencia por servicio.** Respeta la regla de que cada servicio administra sus propios datos (`tech-stack.md`, sección 4).

## Riesgos

- **Migrar a workspaces rompe la publicación de la imagen:** cambian el contexto de build y los comandos. Mitigación: actualizar Dockerfile, compose y README en la misma tarea y verificar `docker compose up --build`.
- **Tokens HS256 vigentes al pasar a RS256:** responden `401` hasta renovarse. Mitigación: el refresh token es opaco y no cambia; el frontend renueva solo. Para producción, desplegar en una ventana corta.
- **Filtración de la clave privada:** sigue siendo crítica. Mitigación: solo auth-service la recibe; en producción va como secreto del entorno, nunca en el repositorio ni en la imagen.
- **`INTERNAL_API_KEY` compartida:** si se filtra, permite llamar rutas internas desde la red interna. Mitigación: las rutas en nombre de un usuario exigen también su JWT; rotarla es redeplegar con un valor nuevo.
- **`trust proxy` mal configurado:** con un valor mayor al real, un cliente podría falsificar su IP. Mitigación: `TRUST_PROXY_HOPS=1` exacto y servicios sin puertos publicados.
- **El gateway como punto único de falla:** si cae, cae todo el acceso. Mitigación: `HEALTHCHECK` y `restart: unless-stopped`; varias réplicas quedan para el despliegue.
