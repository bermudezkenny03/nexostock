# NexoStock Auth Service

Identidad de una instalación **multi-tenant**. Cada **negocio** (`Business`) es un tenant: tiene sus propios usuarios y roles, y todo lo que hagan los demás servicios se filtra por su `businessId`.

- **Modelo:** una sola base de datos y un solo esquema para todos los negocios. Cada fila lleva `business_id` y la base impide mezclar negocios mediante claves foráneas compuestas.
- **Usuarios:** el email es único en toda la instalación y cada usuario pertenece a un solo negocio, con un solo rol.
- **Catálogo:** los módulos y permisos son globales. Los roles son de cada negocio.
- **Token:** el access token (JWT) lleva `businessId`, que es la **única** fuente del contexto de negocio.

Un usuario o un negocio inactivo no puede iniciar sesión ni renovar el token.

## Cómo llamarla

- Base: `http://localhost:3001/api` (`PORT`, por defecto `3001`)
- Swagger: `http://localhost:3001/api/docs`. Se activa con `SWAGGER_ENABLED`, que por defecto vale `true` fuera de producción.
- Todas las rutas exigen `Authorization: Bearer <accessToken>`, salvo `health`, `register`, `login`, `refresh` y `logout`. El guard JWT es global y las rutas abiertas se marcan con `@Public()`.
- No envíes `businessId` en el body. Usuarios, roles y negocio se resuelven con el del token.
- Un navegador solo entra si su origen está en `CORS_ORIGINS`. En local eso es Vite en `5173` o `5174`.
- Cabeceras de seguridad con `helmet`. Límite global de peticiones: `THROTTLE_LIMIT` por `THROTTLE_TTL` ms. Las rutas de auth tienen límites propios, más estrictos.

Formato de error: `{ statusCode, message, error, timestamp, path }`. Los mensajes de reglas de negocio están en español. Si dos peticiones chocan en la base (dos altas con el mismo email, por ejemplo), la respuesta es `409`, no `500`.

## Auth

### `POST /api/auth/register` — 201 (público)

Da de alta un **negocio nuevo**: crea sus tres roles de sistema y su primer usuario con rol `OWNER`, y devuelve la sesión ya iniciada (misma respuesta que el login).

```json
{
  "businessName": "Papelería La Esquina",
  "firstName": "Ana",
  "lastName": "Pérez",
  "email": "ana@laesquina.com",
  "password": "SecurePass1"
}
```

- `409` si el email ya existe.
- `403` si `REGISTRATION_ENABLED=false`.
- Máximo 5 registros por hora y por IP.

### `POST /api/auth/login` — 200 (público)

```json
{ "email": "admin@nexostock.local", "password": "Admin123!" }
```

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<opaco>",
  "user": {
    "id": "<uuid>",
    "email": "admin@nexostock.local",
    "businessId": "<uuid>",
    "businessName": "NexoStock Demo",
    "businessPrimaryColor": "#0F766E",
    "businessLogoUrl": null,
    "firstName": "System",
    "lastName": "Admin",
    "roles": ["OWNER"],
    "permissions": ["business.manage", "users.manage", "..."]
  }
}
```

- `401` («Credenciales inválidas») si el email no existe o la contraseña es incorrecta. Las dos respuestas tardan lo mismo, así que medir el tiempo no revela qué emails existen.
- `403` si la contraseña es correcta pero el usuario o el negocio están inactivos.
- Guarda `last_login_at`.
- Máximo 5 intentos por minuto.

### `POST /api/auth/refresh` — 200 (público)

Body `{ "refreshToken" }`. Responde `{ accessToken, refreshToken }`.

- **Cada refresh token sirve una sola vez.** La rotación es atómica: si llegan dos peticiones simultáneas con el mismo token, solo una gana.
- **Detección de reutilización:** presentar un refresh ya usado cierra **todas** las sesiones de ese usuario, porque indica que el token se filtró.
- `401` si el token no es válido, expiró, ya se usó, o el usuario o el negocio están inactivos.

### `POST /api/auth/logout` — 204 (público)

Body `{ "refreshToken" }`. Revoca ese refresh token.

### `POST /api/auth/logout-all` — 204

Bearer. Revoca todos los refresh tokens del usuario («cerrar sesión en todos los dispositivos»).

### `POST /api/auth/change-password` — 204

Bearer. Body `{ "currentPassword", "newPassword" }`. Al terminar, todas las sesiones del usuario quedan cerradas.

- `400` si la contraseña actual es incorrecta o la nueva no cumple la política.

### `GET /api/auth/me` — 200

Bearer. Devuelve el mismo objeto `user` del login, leído de la base en ese momento.

### Política de contraseñas

De 8 a 72 caracteres, con al menos una letra y un número. El límite de 72 se debe a que bcrypt ignora todo lo que pasa de 72 bytes.

## Rutas acotadas por negocio

| Método | Ruta | Permiso |
| --- | --- | --- |
| `GET` `POST` `PATCH` | `/api/users`, `/api/users/:id` | `users.manage` |
| `GET` `POST` `PATCH` `DELETE` | `/api/roles`, `/api/roles/:id` | `roles.manage` |
| `GET` | `/api/business/me` | cualquier usuario autenticado |
| `PATCH` | `/api/business/me` | `business.manage` |

Un recurso de otro negocio responde `404`, nunca `403`, para no revelar que existe.

### Reglas de usuarios

Además del permiso `users.manage`, se aplican estas reglas:

- **Roles privilegiados (`OWNER` y `SUPER_ADMIN`):** solo quien tiene uno de ellos puede crear, editar o asignar cuentas con esos roles. Así se evita que un administrador con `users.manage` le cambie la contraseña al dueño o se ascienda a sí mismo. → `403`
- **Autoedición:** nadie puede desactivarse, cambiarse el rol ni resetearse la contraseña desde `/api/users`. La contraseña propia se cambia en `/auth/change-password`. → `403`
- **Último propietario:** el negocio nunca se queda sin un usuario activo con rol privilegiado. La comprobación bloquea la fila del negocio para que dos peticiones simultáneas no se la salten. → `409`
- **Sesiones:** cambiar el rol, el email o la contraseña de un usuario, o desactivarlo, revoca todos sus refresh tokens.
- **Campos nulos:** los campos obligatorios no aceptan `null` (`400`). Solo `phone` acepta `null`, para borrarlo.

### Reglas de roles

- Los roles de sistema (`isSystem`) no se pueden editar ni borrar.
- **Escalada de permisos:** solo puedes otorgar permisos que tú mismo tienes. → `403`
- Un rol asignado a usuarios no se puede borrar (`409`). La base lo refuerza con `ON DELETE RESTRICT`, y el listado incluye `userCount`.
- El código de rol es único dentro del negocio.

### Roles de sistema (se crean en cada negocio)

| Código | Nombre | Permisos |
| --- | --- | --- |
| `OWNER` | Propietario | todos |
| `INVENTORY_ADMIN` | Administrador de inventario | `products.view`, `products.manage`, `inventory.view`, `inventory.manage` |
| `SALES_EMPLOYEE` | Empleado de ventas | `products.view`, `sales.view`, `sales.manage` |

### Equipo de NexoStock (`SUPER_ADMIN`)

El equipo de NexoStock vive en un negocio más, `NexoStock` (`PLATFORM_BUSINESS_ID` en `permission.constants.ts`), con un solo rol de sistema:

| Código | Nombre | Permisos |
| --- | --- | --- |
| `SUPER_ADMIN` | Superadministrador | `users.manage`, `roles.manage`, `business.manage`, `modules.view` y `platform.manage` |

- Dentro de su negocio usa las mismas rutas que un dueño (`/api/users`, `/api/roles`, `/api/business/me`) para administrar a su propio equipo. No tiene permisos de productos, inventario, ventas ni reportes: su negocio no es una tienda.
- `platform.manage` solo puede existir en roles del negocio NexoStock: no aparece en el catálogo de las tiendas, y asignarlo a un rol de tienda responde `403`, lo intente quien lo intente.

### Catálogo global

| Método | Ruta | Permiso |
| --- | --- | --- |
| `GET` | `/api/modules` | `modules.view`, `users.manage` o `roles.manage` |
| `GET` | `/api/permissions` | `modules.view`, `users.manage` o `roles.manage` |
| `GET` | `/api/health` | público |

El módulo `platform` y el permiso `platform.manage` solo se listan a los usuarios del negocio de NexoStock.

## Contrato JWT para los demás servicios

- Algoritmo **HS256** (fijado también al verificar). Secreto compartido: `JWT_SECRET`.
- `iss`: `JWT_ISSUER`, por defecto `nexostock-auth`.
- `aud`: `JWT_AUDIENCE`, por defecto `nexostock-api`. Hay que validar ambos.
- Claims: `sub` (id del usuario), `email`, `businessId`, `roles` y `permissions` (los dos como listas de códigos).
- Caducidad: `JWT_EXPIRES_IN`, por defecto `15m`. Los cambios de rol o de permisos llegan al token en el siguiente refresh. El refresh token es opaco, no es un JWT.
- Cada servicio filtra **todas** sus consultas por el `businessId` del token y nunca acepta un `businessId` enviado por el cliente.

Códigos de permiso: `dashboard.view`, `dashboard.manage`, `products.view`, `products.manage`, `inventory.view`, `inventory.manage`, `sales.view`, `sales.manage`, `reports.view`, `reports.manage`, `users.manage`, `roles.manage`, `business.manage`, `modules.view` y `platform.manage` (solo `SUPER_ADMIN`).

Los errores pueden traer un campo `code` estable para que el cliente no dependa del texto del mensaje. Por ahora: `USER_INACTIVE` en el login de un usuario desactivado.

## Base de datos (esquema `auth`)

- Los IDs son `UUID` nativos y las fechas son `timestamptz`.
- `user_roles` tiene una fila por usuario. Sus claves foráneas compuestas, `(user_id, business_id)` y `(role_id, business_id)`, obligan a que usuario y rol sean del mismo negocio.
- Restricciones `CHECK`:
  - email en minúsculas;
  - nombre de negocio no vacío;
  - color `#RRGGBB`;
  - código de rol en `A-Z0-9_`;
  - `expires_at > created_at` en los refresh tokens.
- Se guarda solo el hash SHA-256 de cada refresh token. Al emitir uno nuevo se borran los ya expirados de ese usuario.

## Bootstrap (todos los entornos)

`src/bootstrap.ts` corre en cada arranque, también en producción, y es idempotente:

1. Crea o actualiza el catálogo global de módulos y permisos.
2. Asegura el negocio `NexoStock` del equipo de plataforma.
3. Sincroniza los roles de sistema de **todos** los negocios con la matriz vigente, así un permiso nuevo llega también a los negocios que ya existían.

No crea usuarios, salvo que reciba `SUPER_ADMIN_EMAIL` y `SUPER_ADMIN_PASSWORD`: en ese caso crea el `SUPER_ADMIN` si no existe y nunca sobrescribe una cuenta. En producción rechaza la contraseña de desarrollo. Opcionales: `SUPER_ADMIN_FIRST_NAME` y `SUPER_ADMIN_LAST_NAME`.

```bash
npm run bootstrap
```

## Seed (solo desarrollo)

`src/seed.ts` ejecuta el bootstrap y agrega cuentas con contraseñas conocidas. **Se niega a ejecutarse con `NODE_ENV=production`** y no vuelve a escribir la contraseña de una cuenta que ya existe.

| Cuenta | Contraseña | Rol | Negocio |
| --- | --- | --- | --- |
| `admin@nexostock.local` | `Admin123!` | `OWNER` | `NexoStock Demo` |
| `superadmin@nexostock.local` | `SuperAdmin123!` | `SUPER_ADMIN` | `NexoStock` |

## Arranque local

Copia `.env.example` a `.env`, levanta Postgres (`docker compose up -d postgres` desde la raíz) y ejecuta en este directorio:

```bash
npm install
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
```

## Tests

```bash
npm test           # unitarios
npm run test:e2e   # e2e contra la base de .env
```

Los e2e cubren:

- aislamiento entre negocios;
- registro de negocios;
- rotación de refresh tokens, reutilización y peticiones concurrentes;
- cambio de contraseña;
- protección del propietario;
- permisos del `SUPER_ADMIN` y su separación de las tiendas;
- bootstrap idempotente, incluso con dos ejecuciones simultáneas;
- escalada de permisos;
- borrado de roles asignados;
- validación de `null`.

## Docker

La imagen usa Node 22, corre con un usuario sin privilegios y declara un `HEALTHCHECK`. Al arrancar ejecuta `prisma migrate deploy`, luego el bootstrap, después el seed **solo si `RUN_SEED=true`**, y por último Nest. Compose local pone `RUN_SEED=true` y `NODE_ENV=development`.

El `Dockerfile` tiene tres etapas: `builder` compila el código, `prod-deps` instala solo las dependencias de producción y la imagen final copia el resultado. Así las herramientas de compilación (`python3`, `make`, `g++`) y la caché de npm no llegan a la imagen final.

La imagen está publicada en Docker Hub como `andresbd2480/nexostock-auth-service`. Desde la raíz del repo:

```bash
docker compose up -d                          # descarga la imagen si no la tienes en local
docker compose up -d --build                  # construye con tu código local
AUTH_SERVICE_TAG=v0.0.1 docker compose up -d  # usa una versión concreta (por defecto: latest)
```

Para publicar una versión nueva, sube `version` en `package.json` y:

```bash
docker build -t andresbd2480/nexostock-auth-service:v<versión> backend/auth-service
docker tag andresbd2480/nexostock-auth-service:v<versión> andresbd2480/nexostock-auth-service:latest
docker push andresbd2480/nexostock-auth-service:v<versión>
docker push andresbd2480/nexostock-auth-service:latest
```

En producción:

- `NODE_ENV=production`
- un `JWT_SECRET` propio (el servicio no arranca con los secretos de ejemplo)
- `CORS_ORIGINS`
- `RUN_SEED=false`
- `SUPER_ADMIN_EMAIL` y `SUPER_ADMIN_PASSWORD` solo en el primer arranque, para crear el `SUPER_ADMIN`; después se pueden quitar.
