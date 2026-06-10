# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## 2026-06-10 #2

### Added
- Option do delete customers and POSes, with a confirmation modal to prevent accidental deletions.

### Changed
- Customer and POSes tables foreign keys recreating them with `ON DELETE CASCADE` to ensure related records are removed when a customer or POS is deleted.
- Updates on a disabled customer make it enabled again.

### Fixed
- Clearing up the phone number input on the customer modal.

### Docker images
- [ghcr.io/rmcampos/polpa-gestao/frontend:app-v2026.06.10.48](https://github.com/RMCampos/polpa-gestao/releases/tag/app-v2026.06.10.48)
- [ghcr.io/rmcampos/polpa-gestao/backend:api-v2026.06.10.31](https://github.com/RMCampos/polpa-gestao/releases/tag/api-v2026.06.10.31)
- [ghcr.io/rmcampos/polpa-gestao/backend:api-v2026.06.10.31-prisma](https://github.com/RMCampos/polpa-gestao/releases/tag/api-v2026.06.10.31)


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
