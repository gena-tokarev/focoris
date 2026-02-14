# Skillbook API Service

Skillbook API is a domain app service behind the portal gateway.

## Responsibilities

- Provide domain/business endpoints for the Skillbook area
- Be consumed directly by the gateway via internal service URL

## Runtime

- Default port: `3002`
- Global prefix: `/api`

## Current Endpoints

- `GET /api` - sample data endpoint
- `GET /api/health` - service health endpoint

## Environment Variables

- `PORT` (optional, default `3002`)

## Run

```bash
pnpm exec nx run @focoris/skillbook-api:serve
```

## Debug

```bash
pnpm exec nx run @focoris/skillbook-api:serve:debug
```

Inspector port: `9231`

## Build

```bash
pnpm exec nx run @focoris/skillbook-api:build:production
```

Output: `dist/skillbook-api`

## Docker

Dockerfile: `skillbook-api/Dockerfile`

Run via root compose:

```bash
docker compose up skillbook-api --build
```
