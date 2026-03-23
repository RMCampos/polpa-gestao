# Polpa Gestão

A full-stack business management web application for managing customers, points-of-sale (POS), products, sales, and delivery routes.

## Features

### Customer & POS Management
Manage your customer database including personal and business details (CPF/CNPJ), phone numbers, and multiple points-of-sale per customer. Each customer can have one or more POS locations, making it easy to track deliveries to different addresses.

### Products
Maintain a product catalog with pricing, cost, and stock information. Products are linked to sales so inventory levels are always up to date.

### Sales
Record and track sales transactions with support for delivery status, payment methods, due dates, and additional comments. Each sale can include multiple products, and the status can be updated as orders are processed and delivered.

### Routes
Define delivery routes organized by day of the week and assign customer POS locations to them. This makes it easy to plan and track distribution for each day.

### Dashboard & Authentication
A dashboard provides analytics and reporting. The application includes user management with role-based access control secured by JWT authentication.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Bootstrap 5 |
| Backend | Node.js 22, Fastify 5, TypeScript |
| Database | PostgreSQL 15 with Prisma ORM |
| Containerization | Docker, Docker Compose |
| CI/CD | GitHub Actions → GitHub Container Registry |
| Deployment | Terraform |

## Running Locally with Docker

The entire application stack (database, backend API, and frontend) can be started with a single command using Docker Compose.

**Prerequisites:** [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed.

**Start all services:**

```bash
docker compose up
```

This command will:
1. Start a **PostgreSQL 15** database on port `5432`
2. Run **Prisma migrations** automatically to set up the database schema
3. Start the **Fastify backend API** on port `3000`
4. Start the **React frontend** (via Nginx) on port `5173`

**Access the application:**

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| Database | `localhost:5432` (user: `admin`, password: `adminpassword`, db: `polpa_gestao`) |

**Optional environment variable:**

To enable CPF/CNPJ document validation, set the `VITE_CPF_CNPJ_API_TOKEN` variable before starting:

```bash
VITE_CPF_CNPJ_API_TOKEN=your_token_here docker compose up
```

**Stop all services:**

```bash
docker compose down
```

Database data is persisted in a Docker volume (`pgdata`) and will survive container restarts. To also remove the volume when stopping, run `docker compose down -v`.

## Deployment

The application is deployed using **Terraform**. The infrastructure-as-code configuration can be found in the following public repository:

[https://github.com/RMCampos/personal-projects-iaac/blob/main/polpa-gestao/main.tf](https://github.com/RMCampos/personal-projects-iaac/blob/main/polpa-gestao/main.tf)

Docker images are built and published to the GitHub Container Registry automatically via GitHub Actions on every push:

- `ghcr.io/rmcampos/polpa-gestao/backend:latest`
- `ghcr.io/rmcampos/polpa-gestao/frontend:latest`
