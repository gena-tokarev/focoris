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

Run all APIs in dev mode:

```bash
pnpm exec nx run-many --target=serve --projects=@focoris/gateway,@focoris/auth-api,@focoris/skillbook-api --parallel
```

Health checks:

- `http://localhost:3000/api/health`
- `http://localhost:3001/api/health`
- `http://localhost:3002/api/health`

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

```bash
docker compose up --build
```

Stop:

```bash
docker compose down
```

Gateway is reachable at `http://localhost:3000`.

## Project Structure

- `gateway/` - API gateway and proxy routing
- `auth-api/` - centralized auth service
- `skillbook-api/` - domain app service
- `*-e2e/` - e2e test projects

## Next Step (Suggested)

Implement a first production-ready auth slice:

1. login/refresh/logout/me contract in `auth-api`
2. token validation in gateway
3. one protected endpoint in `skillbook-api`
4. integration tests through gateway
