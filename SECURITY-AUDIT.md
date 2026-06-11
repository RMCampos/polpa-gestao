# SECURITY-AUDIT: polpa-gestao

> Date: 2026-06-09
> Scope: full repo (backend, frontend, infra, CI/CD)
> Method: static analysis

---

## CRITICAL

### C1 — Hardcoded JWT fallback secret

**File:** `backend/src/index.ts:14`
**Risk:** if `JWT_SECRET` env missing, uses string `'supersecret'`. Anyone knows this can forge tokens = full system access.
**Fix:** rm fallback; make `JWT_SECRET` required at startup + crash if unset.

### C2 — Default admin creds in seed file

**File:** `backend/src/seed.ts:7-15`
**Risk:** user `admin@polpagestao.com` / `admin123` hardcoded. If seed runs in prod (possible via `run-seed.sh`), trivial brute force gives admin access.
**Fix:** read creds from env or generate random password on first seed; log it to stdout only.

### C3 — Zero role-based authorization

**File:** all route files + `backend/src/index.ts:17-23`
**Risk:** `authenticate` decorator only checks JWT validity. Never checks `user.role`. Any authed user (role `user`) can: create other users (`POST /api/users`), delete products, read all sales, etc. Flat permission model — no separation of concerns.
**Fix:** add middleware that checks `request.user.role` against required role per route.

### C4 — No brute-force protection on login

**File:** `backend/src/routes/users.ts:6-21`
**Risk:** `POST /api/users/login` has zero rate limiting, no CAPTCHA, no account lockout. Attacker can spray passwords indefinitely.
**Fix:** rate-limit by IP + email (e.g., `@fastify/rate-limit`); add exponential backoff after N failures.

---

## HIGH

### H1 — Public endpoint leaks customer GPS + buying data

**File:** `backend/src/routes/public.ts:34-88` + `frontend/src/pages/ClosestPos.tsx`
**Risk:** `GET /api/public/pos/closest` requires zero auth. Returns customer names, full addresses, GPS coords, and last buying dates. Anyone can scrape this to build customer profiles + location history.
**Fix:** add basic auth or rate-limit heavily; strip `lastBuyingDate`; return only distance + address (not lat/lng).

### H2 — CORS reflects any origin

**File:** `backend/src/index.ts:8-11`
**Risk:** `origin: true` = any website can call API from browser. Combined with localStorage JWT (H3), XSS on any subdomain = full account takeover.
**Fix:** set explicit allowed origins (env var).

### H3 — JWT in localStorage (XSS-accessible)

**File:** `frontend/src/pages/Login.tsx:29`, `frontend/src/App.tsx:17`, all pages read from `localStorage`
**Risk:** Any XSS (even minor) steals token permanently. No HttpOnly/SameSite cookie protection.
**Fix:** use HttpOnly + Secure + SameSite cookies for token transport; keep JS token only in memory.

### H4 — API tokens baked into frontend Docker image

**File:** `frontend/Dockerfile:7-16` + `docker-compose.yml:64-68`
**Risk:** `VITE_CPF_CNPJ_API_TOKEN` + `VITE_GOOGLE_MAPS_API_KEY` are build args embedded in final JS bundle. Anyone who pulls `ghcr.io/rmcampos/polpa-gestao/frontend` can extract them from `dist/assets/*.js`.
**Fix:** proxy these API calls through backend (never expose tokens to client); or restrict token scopes to minimum.

### H5 — Hard delete of sales (no audit trail)

**File:** `backend/src/routes/sales.ts:254-275`
**Risk:** `DELETE /api/sales/:id` does `prisma.sale.delete()` — irreversible data loss. No soft-delete, no audit log. Financial records vanish.
**Fix:** add `disabledAt` column like other models; keep sale data but mark inactive.

### H6 — Source maps served in production

**File:** `backend/tsconfig.json:21-24`
**Risk:** `sourceMap: true`, `declaration: true`, `declarationMap: true` — production `dist/` maps back to TypeScript sources. Anyone decompiling the image sees full source code.
**Fix:** set `sourceMap: false`, `declaration: false`, `declarationMap: false` for production build.

### H7 — CI deploys to prod without manual approval

**File:** `.github/workflows/deploy.yml:20-22`
**Risk:** `workflow_run` on any completed backend/frontend CD directly triggers Terraform apply. No human gate before prod changes. A broken build can take down production.
**Fix:** require manual `workflow_dispatch` approval for production apply.

---

## MEDIUM

### M1 — DB exposed on host port

**File:** `docker-compose.yml:12`
**Risk:** `5432:5432` mapped to host. Anyone on same network can probe PostgreSQL.
**Fix:** remove port mapping or bind to `127.0.0.1:5432:5432`.

### M2 — ngrok tunnels dev to public internet

**File:** `Taskfile.yml` (ngrok task)
**Risk:** dev environment exposed via ngrok public URL. If dev DB has real data, it's exposed.
**Fix:** use Tailscale/WireGuard instead of ngrok; or ensure dev DB has fake data.

### M3 — No input validation (everything cast `as any`)

**File:** all route files (e.g., `users.ts:7`, `products.ts:22`, `customers.ts`, `sales.ts`)
**Risk:** request body typed `as any` everywhere. No Zod/Joi schema. Prisma catches type errors but not business logic validation. SQL injection unlikely (Prisma paramerizes) but unexpected types can crash or cause weird state.
**Fix:** define Fastify JSON schemas per route; use Zod for runtime validation.

### M4 — Prisma errors leak schema details to client

**File:** `backend/src/routes/products.ts:28-34`
**Risk:** `PrismaClientValidationError` message split and sent to client. Leaks field names, types, constraints.
**Fix:** return generic error to client; log full error server-side only.

### M5 — No HTTPS in compose (plaintext traffic)

**File:** `docker-compose.yml` (all services), `nginx/nginx.conf`
**Risk:** dev mode traffic is HTTP. If accessed over network (or via ngrok), credentials + tokens in plaintext.
**Fix:** terminate TLS at nginx or use Traefik with self-signed cert in dev.

### M6 — Terraform R2 backend skips validation

**File:** `terraform/main.tf:9-19`
**Risk:** `skip_credentials_validation`, `skip_region_validation`, `skip_s3_checksum` = misconfiguration-friendly. State may contain plaintext secrets.
**Fix:** remove skips; configure proper AWS env vars; enable state encryption.

### M7 — No soft-delete stack for visits/routes

**File:** `backend/prisma/schema.prisma` (Route, CustomerPos have no `disabledAt`)
**Risk:** Cascade deletes can destroy route data. No recovery.
**Fix:** add `disabledAt` to all models; soft-delete everywhere.

### M8 — Broad CI permissions

**File:** `.github/workflows/backend-cd.yml:15`, `deploy.yml`
**Risk:** `contents: write` + `packages: write`. Deploy workflow has access to production Kubeconfig via Doppler token.
**Fix:** restrict to `contents: read`, `packages: write` on workflow scope; use OIDC instead of long-lived Doppler tokens.

---

## LOW

### L1 — `strict: false` in backend TS

**File:** `backend/tsconfig.json:38`
**Risk:** no strict null checks. Null pointer bugs slip to runtime.
**Fix:** `strict: true` + fix type errors.

### L2 — `*.pem` in .dockerignore but not .gitignore

**File:** `backend/.dockerignore:7` — `*.pem` excluded from Docker build.
**Risk:** if someone places a .pem key in repo root, git would track it.
**Fix:** add `*.pem` to root `.gitignore`.

### L3 — Password stored as plain `String` in Prisma

**File:** `backend/prisma/schema.prisma:15`
**Risk:** no DB-level constraint on password min length. An app bug could store short/empty hashes. (Mitigated by bcrypt at app level.)
**Fix:** add `@db.VarChar(60)` to match bcrypt output length.

### L4 — No `enabledAt`/`disabledAt` on `Route` model

**File:** `backend/prisma/schema.prisma:96-104`
**Risk:** routes can only be deleted, not soft-disabled.
**Fix:** add `disabledAt DateTime?` to Route schema.

### L5 — `VITE_BUILD_NUMBER: snapshot` in compose

**File:** `docker-compose.yml:68`
**Risk:** images built locally not traceable to any CI run or git commit.
**Fix:** use `git describe --tags` or commit SHA.

### L6 — DB backups not encrypted client-side

**File:** `terraform/main.tf:385-390`
**Risk:** backups uploaded to R2 without client-side encryption. R2 server-side encryption may not be enabled.
**Fix:** encrypt with age/gpg before upload, or use `--sse aws:kms`.

### L7 — No dependency scanning/fuzzing

**File:** entire repo
**Risk:** no Dependabot/Renovate/Snyk for `package.json` deps. Supply chain risk unmanaged.
**Fix:** enable Dependabot or Renovate for npm + Docker.

---

## SUMMARY

| Severity | Count | Key issues |
|----------|-------|------------|
| CRITICAL | 4 | JWT secret fallback, default admin creds, zero RBAC, no login rate-limit |
| HIGH     | 7 | Public GPS leak, open CORS, localStorage JWT, API tokens in image, hard deletes, source maps in prod, no deploy approval gate |
| MEDIUM   | 8 | DB port exposed, ngrok tunnel, no validation, Prisma errors leaked, plaintext HTTP, Terraform skips, no soft-delete, broad CI permissions |
| LOW      | 7 | strict:false, .pem git tracking, password column type, missing disableAt, build snapshot, unencrypted backups, no dependabot |

**Top 3 priorities:**
1. Remove JWT fallback secret (C1) — crash if `JWT_SECRET` unset
2. Add role checks to `authenticate` middleware (C3) — `admin` vs `user` access
3. Rate-limit login endpoint (C4) — `@fastify/rate-limit`
