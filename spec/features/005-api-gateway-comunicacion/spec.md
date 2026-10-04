# 005 · API Gateway y comunicación interna

**Estado:** propuesta

## Qué hace

Define la única puerta de entrada al backend y las reglas con las que los servicios se comunican y confían en la identidad del usuario:

- **`api-gateway`:** recibe todas las peticiones del frontend, verifica el token, aplica controles comunes y las dirige al servicio que corresponde.
- **Contrato de identidad:** el JWT pasa a firmarse con RS256, viaja intacto hasta cada servicio y cada servicio lo vuelve a verificar.
- **Comunicación entre servicios:** HTTP interno, reenviando el token del usuario, con rutas internas que el gateway nunca expone.
- **`service-kit`:** paquete compartido para que cada servicio nuevo nazca con la misma seguridad, sin copiar código.

Resuelve la decisión pendiente de "Integración" de `constitution/tech-stack.md` (protocolo interno, contratos y fallos), salvo la coordinación detallada entre ventas e inventario, que queda para la spec de ventas.

## Por qué

- **Los servicios operativos todavía no existen.** Si nacen sin un contrato común, cada uno resolverá a su manera la autenticación y el aislamiento, y corregirlo después obliga a tocarlos todos.
- **Con HS256 todos los servicios pueden fabricar tokens.** Hoy el token se firma con un `JWT_SECRET` compartido, y con HS256 la misma clave verifica y firma. Si se filtra la configuración de cualquier servicio, alguien podría crear un token de `OWNER` de cualquier negocio, o un token `PLATFORM` ([004](../004-administracion-plataforma/spec.md)) y suspender tiendas.
- **Detrás de un proxy, los límites por IP se rompen.** `auth-service` limita los intentos por IP y no tiene configurado `trust proxy`. Con el gateway delante, todas las peticiones llegarían desde la IP del gateway: el límite de login (5 por minuto) se volvería un límite global para toda la plataforma.
- **La suspensión de un negocio tarda hasta 15 minutos** en aplicarse (004). El gateway puede reducirla a segundos.
- **Hoy `auth-service` publica su puerto directamente.** Los servicios no deberían ser accesibles desde afuera.

## Arquitectura

```text
Navegador ──HTTPS──► api-gateway :3000 ──┬──► auth-service      :3001
                     │                    ├──► products-service  :3002
                     │ verifica el JWT    ├──► inventory-service :3003 ◄──┐
                     │ ámbito por ruta    ├──► sales-service     :3004 ───┘ llamada interna
                     │ estado del negocio └──► reports-service   :3005      (mismo JWT)
                     │ CORS, límites, X-Request-Id
                     │
                     └─ red pública            red interna de Docker (sin puertos publicados)
```

## Diseño

### 1. Qué hace y qué no hace el gateway

| Hace | No hace |
| --- | --- |
| Es el único componente con puerto publicado | Lógica de negocio |
| Verifica firma, emisor, audiencia y vigencia del JWT | Permisos finos (`products.manage`, etc.): los revisa cada servicio |
| Aplica la regla de ámbito por prefijo de ruta | Acceso a base de datos |
| Rechaza peticiones de negocios suspendidos (con caché) | Combinar respuestas de varios servicios |
| CORS, `helmet` y límite global de peticiones por IP | Reintentar peticiones que no son idempotentes |
| Genera `X-Request-Id` y escribe `X-Forwarded-For` | Reescribir rutas: reenvía el mismo path |
| Elimina headers internos que mande el cliente | Exponer rutas `/api/internal/**` |
| Traduce fallos de los servicios a errores uniformes | |

### 2. Tabla de rutas

| Prefijo | Servicio | Token en el gateway | Ámbito |
| --- | --- | --- | --- |
| `/api/auth/**` | auth | Lo decide auth-service (hay rutas públicas) | Lo decide auth-service |
| `/api/platform/**` | auth | Obligatorio | `PLATFORM` |
| `/api/business/**`, `/api/users/**`, `/api/roles/**`, `/api/modules`, `/api/permissions` | auth | Obligatorio | `BUSINESS` |
| `/api/products/**`, `/api/categories/**` | products | Obligatorio | `BUSINESS` |
| `/api/inventory/**` | inventory | Obligatorio | `BUSINESS` |
| `/api/sales/**` | sales | Obligatorio | `BUSINESS` |
| `/api/reports/**` | reports | Obligatorio | `BUSINESS` |
| `/api/health` | el propio gateway | No | — |
| Cualquier otra, incluida `/api/internal/**` | — | — | `404 ROUTE_NOT_FOUND` |

El gateway hace el control general y cada servicio lo repite con `service-kit`: una petición que llegue a un servicio sin pasar por el gateway sigue bloqueada.

### 3. La identidad viaja dentro del JWT

- El gateway reenvía el mismo `Authorization: Bearer <jwt>` sin modificarlo.
- Cada servicio verifica el token y toma `businessId`, `accessScope` y `permissions` de ahí.
- **No existen** headers como `X-Business-Id` o `X-User-Id`. Si el cliente los envía, el gateway los elimina. Esto reemplaza la opción de "header interno" que mencionaba [003](../003-negocio-aislamiento/spec.md).

### 4. RS256: solo auth-service puede firmar

- auth-service firma con su clave privada (`JWT_PRIVATE_KEY`). Es el único componente que la tiene.
- El gateway y los servicios verifican con la clave pública (`JWT_PUBLIC_KEY`), que no sirve para firmar.
- El header del token incluye `kid` (`JWT_KEY_ID`) para permitir rotar claves más adelante.
- Emisor, audiencia, vigencia y claims no cambian (ver contrato abajo).
- Las claves de desarrollo se generan con un script y nunca se suben al repositorio. En producción, el servicio no arranca sin claves o con una clave RSA de menos de 2048 bits. `JWT_SECRET` desaparece.

### 5. Comunicación entre servicios

- **Protocolo:** HTTP/JSON por la red interna de Docker, con la URL de cada servicio en variables de entorno (`INVENTORY_SERVICE_URL`, etc.). No pasa por el gateway ni usa un broker de mensajes.
- **Rutas internas:** bajo `/api/internal/**`. El gateway nunca las enruta, y además exigen el header `X-Internal-Key` (`INTERNAL_API_KEY`, compartida solo entre componentes del backend). Si un error de configuración las expusiera, un usuario igual no podría llamarlas.
- **Llamadas en nombre de un usuario:** el servicio que llama reenvía el mismo JWT. El que recibe aplica sus reglas normales: `businessId` del token y permisos. El permiso exigido es el de la acción original. Por ejemplo, el descuento de inventario por una venta exige `sales.manage`, no `inventory.manage`, porque lo dispara quien registra la venta.
- **Llamadas de sistema (sin usuario):** solo `X-Internal-Key`, y solo para datos no sensibles, como el estado de un negocio. Cualquier otra necesidad requiere tokens de servicio, que quedan fuera de esta spec.
- **Idempotencia:** toda operación interna con efectos exige `Idempotency-Key`. El servicio que recibe guarda la clave por negocio (`UNIQUE (business_id, idempotency_key)`) junto con su respuesta. Repetir la petición devuelve la misma respuesta; reutilizar la clave con otro contenido responde `409 IDEMPOTENCY_KEY_REUSED`. El gateway también reenvía este header desde el frontend, por ejemplo para que un doble clic en "registrar venta" no cree dos ventas.
- **Tiempos y reintentos:** 5 segundos por llamada interna. Solo se reintentan operaciones idempotentes (`GET` o con `Idempotency-Key`), como máximo 2 veces y con espera creciente. Nunca se reintenta una respuesta `4xx`.
- **Errores:** el servicio que llama traduce los fallos a sus propios códigos; nunca devuelve al cliente URLs internas ni trazas.

**Ventas e inventario.** Inventario es la fuente de verdad de las existencias y descuenta con una actualización condicional (`stock >= cantidad`) dentro de su propia transacción. La venta pasa por `PENDING`, `CONFIRMED` y `FAILED`, y si falla después de descontar se compensa liberando el stock. El diseño completo va en la spec de ventas (`constitution/tech-stack.md`, sección 5); esta spec solo fija el transporte, la identidad y la idempotencia que esa coordinación necesita.

### 6. IP real y límites de peticiones

- El gateway sobrescribe `X-Forwarded-For` con la IP real del cliente (ignora la que mande el cliente) y aplica un límite global por IP.
- Los servicios confían en un solo salto (`TRUST_PROXY_HOPS=1`), así que `req.ip` vuelve a ser la IP del cliente. auth-service conserva sus límites por ruta (login, registro, recuperación).
- Solo es seguro si los servicios no son accesibles desde afuera; de lo contrario, cualquiera podría falsificar `X-Forwarded-For`.

### 7. Negocios suspendidos

- Para tokens `BUSINESS`, el gateway consulta `GET /api/internal/businesses/:id/status` en auth-service (llamada de sistema) y guarda la respuesta en caché (`BUSINESS_STATUS_CACHE_TTL`, 30 segundos por defecto).
- Si el negocio está suspendido responde `403 BUSINESS_SUSPENDED`. La suspensión se aplica en segundos en vez de 15 minutos.
- No se aplica a `/api/auth/**`: ahí auth-service ya decide con la base.
- Si auth-service no responde y no hay valor en caché, el gateway deja pasar y lo registra en el log. La barrera de seguridad es la firma del token; la suspensión es una medida administrativa que, en el peor caso, igual se aplica cuando el token caduca.

### 8. Paquete compartido `service-kit`

`backend/packages/service-kit`, consumido con npm workspaces por el gateway y por todos los servicios:

| Parte | Contenido |
| --- | --- |
| Contrato | `JwtPayload`, `parseJwtPayload`, `AccessScope`, nombres de headers, códigos de error, `Page<T>` |
| Autenticación | Verificación RS256; guards `JwtAuthGuard`, `ScopeGuard` (`BUSINESS` por defecto), `PermissionsGuard`, `InternalOnlyGuard`; decoradores `@Public`, `@PlatformOnly`, `@AnyScope`, `@RequirePermissions`, `@CurrentUser`, `@InternalOnly`; funciones puras de verificación para el gateway |
| HTTP | `HttpExceptionFilter` con `code`, middleware de `X-Request-Id`, `configureService(app)` (prefijo, `helmet`, validación, filtro de errores, `trust proxy`), cliente HTTP interno |

No incluye Prisma, lógica de negocio ni la firma de tokens, que sigue siendo exclusiva de auth-service.

## Contrato entre componentes

### JWT

- Algoritmo `RS256`, header con `kid`.
- `iss`: `nexostock-auth` (`JWT_ISSUER`). `aud`: `nexostock-api` (`JWT_AUDIENCE`). Vigencia: `JWT_EXPIRES_IN` (15 minutos por defecto).
- Claims: `sub`, `email`, `businessId`, `accessScope`, `roles`, `permissions` (`accessScope` llega con 004).

### Headers

| Header | Quién lo pone | Regla |
| --- | --- | --- |
| `Authorization` | Cliente | El gateway lo reenvía intacto; un servicio lo reenvía en sus llamadas en nombre del usuario |
| `X-Request-Id` | Gateway | Acepta el del cliente solo si es un UUID válido; si no, genera uno. Se devuelve en la respuesta, se propaga en llamadas internas y aparece en los logs |
| `X-Forwarded-For` | Gateway | Siempre lo sobrescribe con la IP real |
| `Idempotency-Key` | Cliente o servicio que llama | El gateway lo reenvía; obligatorio en operaciones internas con efectos |
| `X-Internal-Key` | Componentes del backend | El gateway lo elimina de toda petición externa; obligatorio en `/api/internal/**` |

El gateway elimina de las peticiones externas: `X-Internal-Key`, `X-Business-Id`, `X-User-Id` y cualquier `X-Forwarded-*` que no haya escrito él.

### Errores

Todos los componentes responden con la misma forma ([004](../004-administracion-plataforma/spec.md)):

```json
{ "statusCode": 503, "message": "El servicio no está disponible. Intenta de nuevo.", "error": "Service Unavailable", "code": "UPSTREAM_UNAVAILABLE" }
```

Códigos del gateway: `ROUTE_NOT_FOUND` (404), `UNAUTHENTICATED` (401), `SCOPE_FORBIDDEN` (403), `BUSINESS_SUSPENDED` (403), `RATE_LIMITED` (429), `UPSTREAM_UNAVAILABLE` (503), `UPSTREAM_TIMEOUT` (504).

### Paginación

`{ "items": [], "total": 0, "page": 1, "pageSize": 20 }`, con `page` y `pageSize` como query params (`pageSize` máximo 100), igual que en 004.

## Criterios de aceptación

_Cada criterio se comprueba con sí/no. Marcar `[x]` al cumplirse._

### Fase A — Contrato y claves

- [ ] auth-service firma con RS256 y su header incluye `kid`; un token firmado con el antiguo `JWT_SECRET` o con otra clave responde `401`.
- [ ] Ningún componente salvo auth-service tiene la clave privada en su configuración.
- [ ] En producción, un componente sin claves o con una clave menor a 2048 bits no arranca.
- [ ] auth-service usa `service-kit` para verificar tokens, guards, filtro de errores y `X-Request-Id`, y sus e2e siguen en verde.
- [ ] Con `TRUST_PROXY_HOPS=1`, dos clientes con IPs distintas detrás del gateway tienen límites de login independientes.

### Fase B — Gateway

- [ ] Solo el gateway publica un puerto en `docker-compose.yml`.
- [ ] Un token inválido o vencido responde `401 UNAUTHENTICATED` en el gateway, sin llegar al servicio.
- [ ] Un token `PLATFORM` recibe `403 SCOPE_FORBIDDEN` en rutas de tienda, y un token `BUSINESS` en `/api/platform/**`.
- [ ] `/api/internal/**` y cualquier prefijo desconocido responden `404 ROUTE_NOT_FOUND`.
- [ ] Los headers `X-Internal-Key`, `X-Business-Id` y `X-User-Id` enviados por el cliente no llegan a ningún servicio.
- [ ] Toda respuesta incluye `X-Request-Id`, y el mismo valor aparece en los logs del gateway y del servicio.
- [ ] Con un servicio caído responde `503 UPSTREAM_UNAVAILABLE`; con uno que no responde a tiempo, `504 UPSTREAM_TIMEOUT`; ambos con la forma de error común.
- [ ] Las peticiones de un negocio suspendido se rechazan con `403 BUSINESS_SUSPENDED` en menos de `BUSINESS_STATUS_CACHE_TTL`.
- [ ] CORS solo admite los orígenes de `CORS_ORIGINS`, configurado en el gateway.
- [ ] `GET /api/health` informa el estado del gateway y de cada servicio.

### Fase C — Comunicación interna

- [ ] Una ruta `/api/internal/**` sin `X-Internal-Key` válida responde `401`, aunque el JWT sea válido.
- [ ] Una llamada interna en nombre de un usuario opera solo sobre el `businessId` de su token.
- [ ] Repetir una operación interna con la misma `Idempotency-Key` devuelve la misma respuesta sin repetir el efecto; con otro contenido responde `409 IDEMPOTENCY_KEY_REUSED`.
- [ ] Una llamada interna que supera 5 segundos se corta y el servicio que llama responde con su propio error, sin exponer URLs internas.

## Fuera de alcance

- Broker de mensajes o eventos asíncronos (la constitución no lo presupone para el MVP).
- Service mesh, mTLS entre servicios y terminación TLS: dependen del entorno de despliegue.
- Endpoint JWKS y rotación con varias claves públicas a la vez (el `kid` ya queda listo para ello).
- Tokens de servicio para jobs programados sin usuario.
- Combinar respuestas de varios servicios en el gateway (BFF).
- Documentación Swagger unificada en el gateway: cada servicio mantiene la suya en desarrollo.
- Trazas distribuidas con herramientas como OpenTelemetry (el `X-Request-Id` cubre lo básico).
- Caché de respuestas, WebSockets y versionado de la API.

## Decisiones

- **Reenviar el JWT en vez de headers de identidad.** No existe ningún header que se pueda falsificar, y cada servicio aplica la misma verificación con o sin gateway. Se descartó `X-Business-Id` porque obliga a confiar en la red y en que nadie llegue al servicio sin pasar por el gateway.
- **RS256 en vez de HS256.** Separa firmar de verificar. Se eligió RS256 entre los algoritmos asimétricos por ser el de soporte más amplio en las librerías que ya usa el proyecto (`@nestjs/jwt`, `passport-jwt`).
- **HTTP REST interno en vez del transporte TCP de NestJS o un broker.** Es el mismo estilo que la API pública, se prueba con `curl` y no agrega infraestructura. El transporte TCP ata la comunicación a un protocolo propio de Nest, y la constitución excluye un broker del MVP.
- **Gateway en NestJS** (lo fija la constitución), que además permite reutilizar `service-kit`. Se descartó Nginx o Kong porque duplicarían la lógica de verificación y ámbito.
- **`X-Internal-Key` además del aislamiento de red.** Agrega una barrera barata por si una ruta interna quedara expuesta por error.
- **El chequeo de suspensión deja pasar si auth-service no responde.** Evita que una caída de auth-service tumbe toda la operación de las tiendas; el peor caso queda acotado por la vigencia del token.
- **Paquete compartido con npm workspaces en vez de copiar código.** Una sola implementación de la seguridad; las copias terminan siendo distintas entre sí.
- **El gateway no reescribe rutas.** Los servicios exponen los mismos paths que ve el frontend, lo que simplifica depurar.

## Documentos relacionados

- [003 · Aislamiento por Negocio](../003-negocio-aislamiento/spec.md)
- [004 · Administración de plataforma](../004-administracion-plataforma/spec.md)
- [002 · Catálogo de productos](../002-productos-catalogo/spec.md) — primer servicio que nace sobre `service-kit`
- [Tecnologías y convenciones](../../constitution/tech-stack.md)
