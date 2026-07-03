# Gemini Context: Polpa Go

This project is a full-stack business management web application designed for managing customers, products, sales, and delivery routes.

## Project Overview

- **Architecture:** Monorepo-like structure with separate `backend` and `frontend` directories.
- **Backend:** Node.js 22, Fastify 5, TypeScript, Prisma ORM.
- **Frontend:** React 19, TypeScript, Vite, Bootstrap 5.
- **Database:** PostgreSQL 15.
- **Infrastructure:** Docker, Docker Compose, GitHub Actions, Terraform.

## Directory Structure

- `backend/`: Fastify API server and Prisma schema.
    - `src/routes/`: API endpoint definitions.
    - `prisma/`: Database schema and migrations.
- `frontend/`: React application.
    - `src/pages/`: Main view components.
    - `src/components/`: Reusable UI components.
    - `src/context/`: React context providers (e.g., Toast).
- `docker-compose.yml`: Orchestrates the database, backend, and frontend for local development.

## Building and Running

### Local Development (Recommended)

The easiest way to run the full stack is using Docker Compose:

```bash
docker compose up
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **Database:** localhost:5432 (User: `admin`, Password: `adminpassword`, DB: `polpa_gestao`)

### Manual Setup

#### Backend
```bash
cd backend
npm install
# Ensure DATABASE_URL is set in .env
npx prisma migrate dev
npm run server # or ./run-server.sh which uses ts-node
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Development Conventions

### Backend
- **Routing:** Register new routes in `backend/src/index.ts` from the `backend/src/routes/` directory.
- **Authentication:** Use the `authenticate` decorator on routes requiring protection. Authentication is JWT-based.
- **Database:** Always update `prisma/schema.prisma` and run `npx prisma migrate dev` for schema changes.
- **Validation:** Use Fastify's built-in schema validation where possible.

### Frontend
- **Styling:** Primarily Bootstrap 5 with custom CSS in `.css` files.
- **State Management:** React Hooks (useState, useEffect) and Context API for global UI state (like notifications).
- **API Calls:** Use `axios`. Environment variables (like `VITE_BACKEND_SERVER`) are used for configuration.

### General
- **Naming:** Use `camelCase` for TypeScript variables, functions, and database fields (as per Prisma schema).
- **Types:** Strictly adhere to TypeScript. Define shared types in `frontend/src/types.ts` or relevant backend models.
- **Testing:** No formal test suite is currently implemented (placeholder in `package.json`). Add tests to `backend/tests` or `frontend/src/__tests__` as needed.

## Common Tasks

- **Seeding the Database:**
  Run `backend/run-seed.sh` or `node dist/seed.js` inside the backend container.
- **Adding a new Data Model:**
  1. Edit `backend/prisma/schema.prisma`.
  2. Run `npx prisma migrate dev --name <migration_name>`.
  3. Regenerate Prisma client (done automatically by migrate).
- **Updating Frontend PWA:**
  Vite PWA plugin is configured in `frontend/vite.config.ts`.
