# 003 - Bootstrap Academy Go API Service

## Feature / Component

- Feature: Academy Service
- Component: Go API service foundation
- Priority: P0
- Branch: `feature/academy-service-skeleton`
- Developer owner: Academy Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket 001
- Source PRD: `apps/backend_api/internal/services/academy/docs/product.md`

## Task

Create the `services/academy` Go service foundation following the current payments, booking, courses, and authorisation service patterns.

## Implementation Notes

- Add `cmd/api`, `internal/config`, `internal/server`, `internal/endpoints`, `internal/dataaccess`, `internal/databases`, and `internal/environments`.
- Add `Dockerfile`, `.dockerignore`, `go.mod`, and `go.sum`.
- Add `/healthz` and `/readyz`.
- Use the shared database server with `DB_NAME`, `DB_USER`, `DB_PASSWORD`, and `DB_HOST` variables.
- Add service base URL to `compose.yml` using the established `ACADEMY_PUBLIC_BASE_URL` naming pattern.
- Do not add service API keys. Service authentication/authorisation is handled by the orchestration/API gateway layer and Authorisation Service.
- Keep endpoint handlers as separate files under `services/academy/internal/endpoints`.
- Use CamelCase Go filenames and function names where the codebase convention requires it.

## Acceptance Criteria

- WHEN `docker compose --profile app up academy` is run, THEN Academy Service starts and passes health checks.
- WHEN `GET /healthz` is called, THEN it returns `200`.
- WHEN the full local compose app is run, THEN app, users, authorisation, courses, booking, payments, and academy services start together.

## Regression / Compatibility Tests

- Tina SHALL add startup tests and health check smoke tests.
- Tina SHALL confirm existing app routes still start with the new service present.

## Out Of Scope

Database schema and business endpoints.
