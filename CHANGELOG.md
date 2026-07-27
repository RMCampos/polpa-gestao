# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## 27/07/2026

### Adicionado
- Nova categoria para POS by Industry: Casa de carnes

### Corrigido
- Bug de filtro na tela de Customers agora filtra corretamente.
- Na tela de dashboard na consulta POS By Industry agora considera apenas customers ativos.
- Notificaçao Toast agora pode ser clicada para fechar corretamente.

```bash
# Docker images
docker pull rmcampos/polpa-gestao-app:app-v2026.07.27.58
docker pull rmcampos/polpa-gestao-api:api-v2026.07.27.61
```

---

## 24/07/2026

### Adicionado
- Opção de clicar para ver ou expandir os clientes por indústria na tela de dashboard.

```bash
# Docker images
docker pull rmcampos/polpa-gestao-app:app-v2026.07.24.44
docker pull rmcampos/polpa-gestao-api:api-v2026.07.24.43
```

---

## 03/07/2026

### Adicionado
- Botão para iniciar uma venda a partir de um PDV na lista de rotas.

### Alterado
- Tela de gerenciar Paradas na página de Rotas, removido o dropdown e adicionado um campo de texto para pesquisa manual.
- Nome do app alterado de Polpa Gestão para Polpa Go.
- Versão das dependências no frontend e backend, atualizado para as últimas versões disponíveis.

### Corrigido
- Tamanho e viewport em dispositivos móveis empurrando components para fora da tela visíveil.

```bash
# Docker images
docker pull rmcampos/polpa-gestao-app:app-v2026.07.03.32
```

---

## 24/06/2026

### Alterado
- Dependências do projeto atualizadas para a última versão, incluindo React.

### Corrigido
- Número do build da versão não aparecendo corretamente.

```bash
# Docker images
docker pull rmcampos/polpa-gestao-api:api-v2026.06.24.22
docker pull rmcampos/polpa-gestao-app:app-v2026.06.24.23
```

---

## 2026-06-16

### Changed
- Container Registry to Docker Hub.
- Migrated from GitHub to Gitea.

```bash
# Docker images
docker pull rmcampos/polpa-gestao-app:app-v2026.06.16.8
docker pull rmcampos/polpa-gestao-api:api-v2026.06.16.7
```

---

## 2026-06-13 #1

### Fixed
- Missing Google Maps API Key and CPF CNPJ API Key integration in backend deployment.

### Docker images
- [ghcr.io/rmcampos/polpa-gestao/backend:api-v2026.06.11.34](https://github.com/RMCampos/polpa-gestao/releases/tag/api-v2026.06.11.34)
- [ghcr.io/rmcampos/polpa-gestao/backend:api-v2026.06.11.34-prisma](https://github.com/RMCampos/polpa-gestao/releases/tag/api-v2026.06.11.34)

## 2026-06-11 #3

### Fixed
- Login issue due to jwt secrets missing in production.

## 2026-06-11 #2

### Added
- Created `CustomerDeleted` audit database table and model to log details of deleted customers.
- Created `/api/proxy/validator` and `/api/proxy/geocode` endpoints in backend to proxy third-party validation and mapping requests securely.
- Added `/api/users/me` and `/api/users/logout` endpoints in backend for cookie session verification and cleanup.

### Changed
- Configured explicit allowed origins for CORS from `ALLOWED_ORIGINS` environment variable, defaulting to `http://localhost:5173`.
- Gated public closest POS endpoint `/api/public/pos/closest` with rate-limiting (max 15/min) and removed `lat`, `lng`, and `lastBuyingDate` fields from its response.
- Configured `@fastify/jwt` to read tokens from `polpaAuth` HttpOnly cookie.
- Overrode frontend `localStorage` to store `token` and `user` strictly in-memory (JS variables) instead of persistent disk storage.
- Proxy validation and geocoding in frontend `Customers.tsx` through backend instead of using direct third-party calls.
- Compiled production backend build without TS source maps or declarations using a specialized `tsconfig.prod.json`.
- JWT token is no longer returned in login or `/api/users/me` response bodies — token is exclusively transported via the `polpaAuth` HttpOnly cookie and never exposed to JavaScript.
- Removed all `Authorization: Bearer` headers from frontend API calls — authentication relies solely on the HttpOnly cookie sent automatically by the browser.
- `Storage.prototype` override now only intercepts the `user` key (token interception removed as token no longer exists in JS context).
- Cookie signing reverted to `signed: false` — JWT's own HMAC signature provides integrity; `@fastify/cookie` layer was redundant and non-functional in v11.

### Fixed
- H1: Public endpoint leaks customer GPS + buying data.
- H2: CORS reflects any origin.
- H3: JWT in localStorage (XSS-accessible).
- H4: API tokens baked into frontend Docker image.
- H5: Hard delete of sales (no audit trail) mitigated by auditing customer deletes via `CustomerDeleted`.
- H6: Source maps served in production.
- Parameter injection vulnerability in `/api/proxy/validator`: `value` and `token` query parameters are now URL-encoded before being forwarded to the Invertexto API.
- Session re-issue on every `/api/users/me` call removed — endpoint now returns user data only, without silently extending the session on each page load.
- `Storage.prototype` override applied at prototype level instead of instance level, fixing Firefox compatibility where instance-level assignment was silently ignored.

### Docker images
- [ghcr.io/rmcampos/polpa-gestao/frontend:app-v2026.06.11.52](https://github.com/RMCampos/polpa-gestao/releases/tag/app-v2026.06.11.52)
- [ghcr.io/rmcampos/polpa-gestao/backend:api-v2026.06.11.34](https://github.com/RMCampos/polpa-gestao/releases/tag/api-v2026.06.11.34)
- [ghcr.io/rmcampos/polpa-gestao/backend:api-v2026.06.11.34-prisma](https://github.com/RMCampos/polpa-gestao/releases/tag/api-v2026.06.11.34)
- 
## 2026-06-11 #1

### Added
- Scoped rate limiting using `@fastify/rate-limit` for `/api/users/login` endpoint keyed by IP + email.
- In-memory login failure tracking with exponential backoff lockout after 3 consecutive failures.
- Role-based authorization middleware via `requireAdmin` decorator on Fastify backend.
- Enforced admin role requirement on Users management, Product modification, Customer/POS deletion, Sale deletion, and Dashboard routes.
- Frontend role guards and conditional sidebar rendering to restrict non-admin users from accessing Users or Dashboard views.

### Changed
- Removed hardcoded fallback JWT signature secret.
- Seed script updated to read admin credentials from environment variables or generate a secure random password on first seed.
- Docker compose configuration updated to forward `JWT_SECRET` to the backend container.

### Fixed
- Hardcoded default admin user credentials security vulnerability (C2).
- Zero role-based authorization model allowing non-admin users to reach admin endpoints (C3).
- Potential authentication bypass due to fallback JWT secret when environment variable is missing (C1).
- No brute-force protection on user login (C4).

### Docker images
- [ghcr.io/rmcampos/polpa-gestao/frontend:app-v2026.06.11.50](https://github.com/RMCampos/polpa-gestao/releases/tag/app-v2026.06.11.50)
- [ghcr.io/rmcampos/polpa-gestao/backend:api-v2026.06.11.33](https://github.com/RMCampos/polpa-gestao/releases/tag/api-v2026.06.11.33)
- [ghcr.io/rmcampos/polpa-gestao/backend:api-v2026.06.11.33-prisma](https://github.com/RMCampos/polpa-gestao/releases/tag/api-v2026.06.11.33)

## 2026-06-10 #2

### Added
- Option do delete customers and POSes, with a confirmation modal to prevent accidental deletions.

### Changed
- Customer and POSes tables foreign keys recreating them with `ON DELETE CASCADE` to ensure related records are removed when a customer or POS is deleted.
- Updates on a disabled customer make it enabled again.

### Fixed
- Clearing up the phone number input on the customer modal.

### Docker images
- [ghcr.io/rmcampos/polpa-gestao/frontend:app-v2026.06.10.49](https://github.com/RMCampos/polpa-gestao/releases/tag/app-v2026.06.10.49)
- [ghcr.io/rmcampos/polpa-gestao/backend:api-v2026.06.10.32](https://github.com/RMCampos/polpa-gestao/releases/tag/api-v2026.06.10.32)
- [ghcr.io/rmcampos/polpa-gestao/backend:api-v2026.06.10.32-prisma](https://github.com/RMCampos/polpa-gestao/releases/tag/api-v2026.06.10.32)


## 2026-06-10 #1

### Added
- Card to the dashboard page displaying customer POSes and their last buying date for those who haven't bought anything in 10 days or more.

### Docker images
- [ghcr.io/rmcampos/polpa-gestao/frontend:app-v2026.06.10.48](https://github.com/RMCampos/polpa-gestao/releases/tag/app-v2026.06.10.48)
- [ghcr.io/rmcampos/polpa-gestao/backend:api-v2026.06.10.31](https://github.com/RMCampos/polpa-gestao/releases/tag/api-v2026.06.10.31)
- [ghcr.io/rmcampos/polpa-gestao/backend:api-v2026.06.10.31-prisma](https://github.com/RMCampos/polpa-gestao/releases/tag/api-v2026.06.10.31)

## [app-v2026.06.08.47](https://github.com/RMCampos/polpa-gestao/releases/tag/app-v2026.06.08.47) - 2026-06-08

### Added
- Professional local development setup with Taskfile and Doppler for secure secret management.
- Doppler integration in CI/CD workflows for streamlined secret handling.
- POS by Region summary on the dashboard for better regional insights.
- Dashboard drill-down for Total Fridges with POS-level modal and API.
- POS Industry Summary endpoint and dashboard card.
- Industry field to Customer POS for categorization.
- Optional `region` field to POS for filtering and reporting.
- Optional `notes` field for customers in Prisma schema and database migration.
- Notes textarea in the customer create/edit modal with support for loading existing notes.
- Optional notes snippet display on customer cards.

### Changed
- Improved Terraform deployment plan with variables for better configurability.
- Updated README with clearer setup instructions.
- CI/CD workflows updated to use Doppler for environment secrets.
- Frontend build CI improved with Doppler integration.
- Container names and Docker flows updated for better naming consistency.
- Quantity input in sales page changed to text type for better UX.
- Closest page updated to include customer name for easier identification.
- Customer POST/PUT API handlers now accept and persist optional `notes`.

### Fixed
- Unable to type all 14 digits for enterprise documents on customer creation.
- Wrong Doppler secret name in multiple workflow files.
- Prevented duplicate Customer and POS creation.

## [[app-v2026.06.03.45]](https://github.com/RMCampos/polpa-gestao/releases/tag/app-v2026.06.03.45) - 2026-06-03

- Initial tagged release.
