# Gateway Service

Gateway is the single entry point for portal clients. It forwards requests to backend apps.

## Responsibilities

- Expose a single public API surface
- Route requests to internal services
- Central place for future cross-cutting concerns (auth checks, rate limits, request tracing)

## Runtime

- Default port: `3000`
- Global prefix: `/api`

## Routes

- `GET /api/health` - gateway health endpoint
- `ALL /api/auth/*` - proxied to Auth API
- `ALL /api/skill-book/*` - proxied to Skillbook API

## Required Environment Variables

- `PORT` (example: `3000`)
- `AUTH_API_URL` (example: `http://localhost:3001`)
- `SKILL_BOOK_API_URL` (example: `http://localhost:3002`)

`gateway/src/config/config.validation.ts` validates service URL variables.

## Run

```bash
pnpm exec nx run @focoris/gateway:serve
```

## Debug

```bash
pnpm exec nx run @focoris/gateway:serve:debug
```

Inspector port: `9229`

## Build

```bash
pnpm exec nx run @focoris/gateway:build:production
```

Output: `dist/gateway`

## Docker

Dockerfile: `gateway/Dockerfile`

Run via root compose:

```bash
docker compose up gateway --build
```
