# Focoris Portal Monorepo

This repository contains a backend portal platform built with **Nx + NestJS**:

- **Gateway** (`@focoris/gateway`) as the single entry point
- **Auth API** (`@focoris/auth-api`) as the shared authentication service
- **Skillbook API** (`@focoris/skillbook-api`) as one domain app
- Additional apps can be added behind the gateway using the same pattern

## Architecture

All services expose routes under `/api`.

- Gateway (port `3000`) proxies:
  - `/api/auth/*` -> Auth API
  - `/api/skill-book/*` -> Skillbook API
- Auth API (port `3001`) serves auth-domain endpoints
- Skillbook API (port `3002`) serves domain endpoints

## Tech Stack

- **Monorepo:** Nx 22
- **Backend framework:** NestJS 11
- **Build:** `@nx/webpack:webpack` + TypeScript
- **Package manager:** pnpm
- **Containerization:** Docker + Docker Compose

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose (optional, for containerized run)

## Install

```bash
pnpm install
```

## Run Locally

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Optional test PostgreSQL service:

```bash
docker compose up -d postgres-test
```

Prepare auth database (once, or when schema changes):

```bash
pnpm exec nx run @focoris/auth-api:db:generate
pnpm exec nx run @focoris/auth-api:db:migrate
pnpm exec nx run @focoris/auth-api:db:seed
```

Run all APIs in dev mode:

```bash
pnpm exec nx run-many --target=serve --projects=@focoris/gateway,@focoris/auth-api,@focoris/skillbook-api --parallel
```

Health checks:

- `http://localhost:3000/api/health`
- `http://localhost:3001/api/health`
- `http://localhost:3002/api/health`

## Auth E2E

Auth e2e runs with one Nx/Jest target and uses Testcontainers inside Jest global setup.
The setup starts:
- a temporary PostgreSQL container
- Prisma migrations against that container
- `auth-api` (`@focoris/auth-api:serve:test`)

Run:

```bash
cp auth-api-e2e/.env.example auth-api-e2e/.env
cp auth-api/.env.test.example auth-api/.env.test
pnpm exec nx run @focoris/auth-api-e2e:e2e
```

`auth-api-e2e/.env` configures API port and test Postgres container settings.

CI target:

```bash
pnpm exec nx run @focoris/auth-api-e2e:e2e-ci
```

## Debug

Run all APIs in debug mode:

```bash
pnpm exec nx run-many --target=serve --configuration=debug --projects=@focoris/gateway,@focoris/auth-api,@focoris/skillbook-api --parallel
```

VS Code launch configurations are in `.vscode/launch.json`:

- `Debug @focoris/gateway with Nx`
- `Debug @focoris/auth-api with Nx`
- `Debug @focoris/skillbook-api with Nx`
- `Debug All APIs`
- `Debug All APIs with Nx run-many`

## Run with Docker Compose

Create root env file first:

```bash
cp .env.example .env
```

```bash
docker compose up --build
```

Stop:

```bash
docker compose down
```

Gateway is reachable at `http://localhost:3000`.
PostgreSQL is reachable at `localhost:5432`.
Test PostgreSQL is reachable at `localhost:5433`.

## Project Structure

- `gateway/` - API gateway and proxy routing
- `auth-api/` - centralized auth service
- `skillbook-api/` - domain app service
- `*-e2e/` - e2e test projects
