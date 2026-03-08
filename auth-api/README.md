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
pnpm exec nx run @focoris/auth-api:serve
```

Run with test env file:

```bash
cp auth-api/.env.test.example auth-api/.env.test
pnpm exec nx run @focoris/auth-api:serve:test
```

## Debug

```bash
pnpm exec nx run @focoris/auth-api:serve:debug
```

Inspector port: `9230`

## Docker

Use root compose with PostgreSQL:

```bash
docker compose up postgres auth-api --build
```

Optional test database container:

```bash
docker compose up -d postgres-test
```
