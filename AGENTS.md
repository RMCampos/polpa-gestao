# AGENTS.md

This document provides context and guidelines for AI agents interacting with the Polpa Go project.

## Project Overview

Polpa Go is a full-stack business management web application designed for managing customers, products, sales, and delivery routes. It serves as a comprehensive platform for administrative tasks within a business.

## Architecture

The project has a monorepo-like structure with distinct `backend` and `frontend` components.

-   **Backend**: Developed with Node.js 22, Fastify 5, and TypeScript, utilizing Prisma ORM for database interaction.
    -   API Endpoints: Defined in `backend/src/routes/`.
    -   Database Schema: Managed with Prisma in `backend/prisma/`.
-   **Frontend**: Built with React 19, TypeScript, Vite, and styled with Bootstrap 5.
    -   Main Views: Located in `frontend/src/pages/`.
    -   Reusable Components: Found in `frontend/src/components/`.
-   **Database**: PostgreSQL 15.
-   **Infrastructure**: Docker, Docker Compose for local orchestration.

## Local Development Setup for Agents

The recommended way for an AI agent to set up and run the project for local interaction is using **Taskfile + Doppler** (which wraps Docker Compose).

### Prerequisites

-   Docker and Docker Compose
-   [Task](https://taskfile.dev/installation/)
-   [Doppler CLI](https://docs.doppler.com/docs/cli)

### Configure Doppler

Project defaults are defined in `doppler.yaml`:

-   project: `polpa-gestao`
-   config: `dev_ricardo`

Authenticate and configure Doppler before running tasks:

```bash
doppler login
doppler setup --project polpa-gestao --config dev_ricardo
```

### Run with Taskfile

To start all services in background:

```bash
task dev-up
```

To stop:

```bash
task dev-down
```

To stop and remove volumes/orphans:

```bash
task dev-tier-down
```

Once running, services are accessible at:

-   **Frontend**: http://localhost:5173
-   **Backend API**: http://localhost:3000
-   **Database**: localhost:5432 (User: `admin`, Password: `adminpassword`, DB: `polpa_gestao`)

### Build images with Taskfile

Use these tasks for local image builds:

```bash
task build-frontend
task build-backend
task build-prisma
```

All build tasks run with `doppler run`, so required secrets (for example API tokens and maps keys) come from Doppler-managed environment values.

## Interaction Points for Agents

### Backend API

Agents can interact with the backend API via HTTP requests to `http://localhost:3000`.

-   **Authentication**: Routes requiring authentication use JWT. Agents might need to obtain a token via a login endpoint (e.g., `/auth/login`) and include it in subsequent requests.
-   **Data Models**: Database schema and models are defined in `backend/prisma/schema.prisma`. Agents modifying data should be aware of these structures.
-   **Validation**: Backend endpoints often have schema validation. Agents should adhere to expected request body/query parameter formats.

### Database

Direct database interaction through Prisma commands can be performed within the `backend` directory.

-   **Schema Changes**: Any changes to the database schema require updating `backend/prisma/schema.prisma` and running `npx prisma migrate dev`.
-   **Seeding**: The database can be seeded using `backend/run-seed.sh`.

## Development Conventions for Agents

-   **Naming**: Follow `camelCase` for TypeScript variables, functions, and database fields.
-   **Types**: Adhere strictly to TypeScript. Shared types are often in `frontend/src/types.ts` or relevant backend models.
-   **Code Location**:
    -   Backend routes: `backend/src/routes/`
    -   Frontend pages: `frontend/src/pages/`
    -   Frontend components: `frontend/src/components/`

## Testing

Currently, there is no formal test suite implemented. Agents making changes should consider adding basic tests for new functionalities in `backend/tests` or `frontend/src/__tests__` if appropriate.
