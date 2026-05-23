# Auth API Service

Auth API is the central authentication service for the portal.

## Runtime

- Port: `3001`
- Global prefix: `/api`
- Auth routes: `/api/auth/*`

## Endpoints

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/health`

## Environment Variables

- `PORT` default `3001`
- `DATABASE_URL` PostgreSQL connection string
- `AUTH_ACCESS_TOKEN_SECRET`
- `AUTH_REFRESH_TOKEN_SECRET`
- `AUTH_ACCESS_TOKEN_TTL_SECONDS`
- `AUTH_REFRESH_TOKEN_TTL_SECONDS`

## Database

Prisma schema: `auth-api/prisma/schema.prisma`

Generate client:

```bash
pnpm exec nx run @focoris/auth-api:db:generate
```

Create/apply migration:

```bash
pnpm exec nx run @focoris/auth-api:db:migrate
```

Seed default admin:

```bash
pnpm exec nx run @focoris/auth-api:db:seed
```

Default seed user:
- email: `admin@focoris.local`
- password: `admin123`

## Run

```bash
pnpm nx serve @focoris/auth-api
```

Equivalent explicit development command:

```bash
pnpm nx run @focoris/auth-api:serve:development
```

Build without starting the app:

```bash
pnpm nx run @focoris/auth-api:build
```

## Debug

```bash
pnpm nx run @focoris/auth-api:serve:debug
```

Inspector port: `9230`

If changes in shared libs under `libs/` do not trigger restarts, start the Nx daemon once:

```bash
pnpm nx daemon --start
pnpm nx daemon
```

You should see `Nx Daemon is running.` after that.

## E2E

`auth-api-e2e` uses Testcontainers and starts its own PostgreSQL database automatically.
The e2e setup:

- loads `auth-api-e2e/.env`
- starts a temporary PostgreSQL container
- runs Prisma migrations against that container
- starts `@focoris/auth-api` with runtime `DATABASE_URL` and `PORT` overrides

Run:

```bash
pnpm exec nx run @focoris/auth-api-e2e:e2e
```

## Docker

Use root compose with PostgreSQL:

```bash
docker compose up postgres auth-api --build
```
