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

## Running Locally with Taskfile + Doppler

The project uses `Taskfile.yml` to standardize local commands and `doppler.yaml` to define Doppler project/config for secrets.

**Prerequisites:** [Docker](https://docs.docker.com/get-docker/), [Docker Compose](https://docs.docker.com/compose/install/), [Task](https://taskfile.dev/installation/), and [Doppler CLI](https://docs.doppler.com/docs/cli).

### 1. Authenticate and configure Doppler

`doppler.yaml` defaults to:

- project: `polpa-gestao`
- config: `dev_secrets`

```bash
doppler login
doppler setup --project polpa-gestao --config dev_secrets

# PS: tokens will be handled directly in runs, injected as ENV VARS
```

### 2. Start services

```bash
task dev-up
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
| Database | `localhost:5432` (Please run `task dev-db-access` to get DB credentials) |

### Optional ngrok stack

To run the ngrok compose file:

```bash
task dev-up-ngrok
```

### Build Docker images

```bash
task build-all

# For ngrok, use
task build-all-ngrok
```

Build tasks run with `doppler run`, which injects secrets as environment variables (for example `CPF_CNPJ_API_TOKEN` and `GOOGLE_MAPS_API_KEY`) during Docker builds.

### Stop services

```bash
task dev-down

# For ngrok, use
task dev-down-ngrok
```

To also remove volumes/orphans:

```bash
task dev-tier-down
```

Database data is persisted in a Docker volume (`pgdata`) and survives regular restarts.

## Running Locally with Docker Compose (Alternative)

If you prefer not to use Taskfile, you can still start the stack directly:

```bash
docker compose up
```

## Deployment

The application is deployed using **Terraform**. The infrastructure-as-code configuration can be found in the terraform directory:

[terraform/main.tf](terraform/main.tf)

Docker images are built and published to the GitHub Container Registry automatically via GitHub Actions on every push:

- `docker.io/rmcampos/polpa-gestao-app:latest`
- `docker.io/rmcampos/polpa-gestao-api:latest`
