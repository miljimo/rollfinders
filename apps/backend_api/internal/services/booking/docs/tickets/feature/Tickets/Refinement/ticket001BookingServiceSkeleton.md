# 001 - Booking Service Skeleton

## Feature / Component

- Feature: Booking Service
- Component: Go API service foundation
- Priority: P0
- Branch: `feature/booking-service-skeleton`
- Developer owner: Booking Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: None
- Source PRD: `apps/backend_api/internal/services/booking/docs/prds/proposal.md`

## Task

Create the `services/booking` Go service foundation following the existing Course Service and Payment Service structure.

## Implementation Notes

- Add `cmd/api`, `internal/config`, `internal/handlers`, `internal/server`, `internal/dataaccess`, `internal/databases`, and `internal/environments`.
- Add `Dockerfile`, `.dockerignore`, `go.mod`, `go.sum`, and service `compose.yml`.
- Add `/healthz` and `/readyz` endpoints.
- Add internal bearer/API-key auth middleware for protected endpoints.
- Add request IDs, JSON error envelopes, and clean handler helpers.
- Use camelCase function names for service functions and database procedure/function names.
- Keep files focused and small; each endpoint handler should live in its own file when implementation begins.

## Acceptance Criteria

- WHEN `docker compose --profile app up booking` is run, THEN Booking Service starts and passes health checks.
- WHEN `GET /healthz` is called, THEN the service returns `200`.
- WHEN a protected endpoint is called without API credentials, THEN it returns a stable unauthorized error envelope.
- WHEN code is reviewed, THEN package layout matches the established Go service pattern.

## Regression / Compatibility Tests

- Tina SHALL verify app, users, courses, and payments services still start under the app profile.
- Tina SHALL add service startup and auth middleware tests.

## Out Of Scope

Booking persistence and business endpoints.
