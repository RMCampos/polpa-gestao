# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [app-v2026.06.08.47] - 2026-06-08

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

## [app-v2026.06.03.45] - 2026-06-03

- Initial tagged release.
