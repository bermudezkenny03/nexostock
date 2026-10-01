# NexoStock Auth Service

NestJS API for authentication, users, roles, and RBAC permissions.

## Prerequisites

- Node.js 20+
- PostgreSQL (local or Docker)

## Environment

Copy `.env.example` to `.env` and adjust values:

| Variable | Description |
| --- | --- |
| `PORT` | HTTP port (default `3001`) |
| `DATABASE_URL` | PostgreSQL URL with `?schema=auth` |
| `JWT_SECRET` | Signing secret for access tokens |
| `JWT_EXPIRES_IN` | Access token lifetime (default `15m`) |
| `REFRESH_EXPIRES_IN` | Refresh token lifetime (default `7d`) |
| `REFRESH_TOKEN_BYTES` | Entropy for opaque refresh tokens (default `32`) |
| `BCRYPT_ROUNDS` | Password hashing cost (default `10`) |
| `THROTTLE_TTL` | Global throttle window in ms (default `60000`) |
| `THROTTLE_LIMIT` | Global throttle max requests per window (default `100`) |

Login is limited to **5 requests per minute** and refresh to **10 requests per minute**, regardless of global `THROTTLE_*`.

## Docker Compose (PostgreSQL)

From the repository root:

```bash
docker compose up -d postgres
```

Default Postgres: user `nexostock`, password `nexostock`, database `nexostock`, port `5432`.

To run the auth service in Docker as well:

```bash
docker compose up -d auth-service
```

## Database setup

Install dependencies and generate the Prisma client:

```bash
cd backend/auth-service
npm install
npx prisma generate
```

### Option A: Migrations (recommended)

Fresh database:

```bash
npx prisma migrate deploy
npm run prisma:seed
```

Development (creates/applies migrations):

```bash
npx prisma migrate dev
npm run prisma:seed
```

If the database was created earlier with `db push` and migrate reports drift, baseline the existing schema:

```bash
npx prisma migrate resolve --applied 20251001000000_init_auth
```

### Option B: db push (prototyping)

```bash
npx prisma db push
npm run prisma:seed
```

`db push` syncs the schema without migration history; use `migrate` for team/production workflows.

## Seed / default admin

```bash
npm run prisma:seed
```

Default administrator (defined in `prisma/seed.ts`):

- Email: `admin@nexostock.local`
- Password: `Admin123!`

## Run the API

```bash
npm run start:dev
```

- Health: `GET http://localhost:3001/api/health`
- Swagger UI: `http://localhost:3001/api/docs`

## Tests

```bash
npm run build
npm test
npm run test:e2e
```

E2E auth tests require `DATABASE_URL` and a seeded database (admin user). If `DATABASE_URL` is unset, auth e2e tests are skipped; health e2e still runs.

## API overview

| Area | Prefix |
| --- | --- |
| Auth (login, refresh, logout, me) | `/api/auth` |
| Users | `/api/users` |
| Roles | `/api/roles` |
| Modules & permissions catalog | `/api/modules`, `/api/permissions` |

Protected routes expect `Authorization: Bearer <accessToken>`.

## Auth flow

1. **Login** — `POST /api/auth/login` with email and password. Response includes a short-lived **access token** (JWT), an opaque **refresh token**, and the user profile.
2. **API calls** — Send the access token in the `Authorization: Bearer` header (e.g. `GET /api/auth/me`).
3. **Refresh** — When the access token expires, `POST /api/auth/refresh` with `{ "refreshToken": "..." }`. Returns a new access token and a **rotated** refresh token; the previous refresh token is revoked.
4. **Logout** — `POST /api/auth/logout` with `{ "refreshToken": "..." }` to revoke that refresh token (204 No Content). Further refresh attempts with that token fail.

Refresh tokens are stored hashed (SHA-256) in PostgreSQL; only the opaque value is returned to clients.
