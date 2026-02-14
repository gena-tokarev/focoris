# Auth API Service

Auth API is the centralized authentication backend for the portal.

## Responsibilities

- Provide auth-focused endpoints (current scaffold + future login/token flows)
- Act as the single auth source for gateway and downstream apps

## Runtime

- Default port: `3001`
- Global prefix: `/api`

## Current Endpoints

- `GET /api` - sample data endpoint
- `GET /api/health` - service health endpoint

## Environment Variables

- `PORT` (optional, default `3001`)

## Run

```bash
pnpm exec nx run @focoris/auth-api:serve
```

## Debug

```bash
pnpm exec nx run @focoris/auth-api:serve:debug
```

Inspector port: `9230`

## Build

```bash
pnpm exec nx run @focoris/auth-api:build:production
```

Output: `dist/auth-api`

## Docker

Dockerfile: `auth-api/Dockerfile`

Run via root compose:

```bash
docker compose up auth-api --build
```
