# 001 - Notification Service Skeleton

## Feature / Component

- Feature: Notification Service
- Component: Go API and worker service foundation
- Priority: P0
- Status: Implemented
- Branch: `feature/notification-service-skeleton`
- Developer owner: Notification Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: None
- Source PRD: `apps/backend_api/internal/services/notification/docs/product.md`

## Task

Create the `services/notification` Go service foundation following the established service structure in this repository.

## Implementation Notes

- Add `cmd/api` for HTTP serving and `cmd/worker` for asynchronous processing.
- Add `internal/config`, `internal/handlers`, `internal/server`, `internal/dataaccess`, `internal/databases`, `internal/domain`, `internal/providers`, `internal/worker`, and `internal/environments`.
- Add `Dockerfile`, `.dockerignore`, `go.mod`, `go.sum`, and service compose wiring if required by the local service pattern.
- Add `/healthz` and `/readyz` endpoints for both API and worker runtime dependencies.
- Add internal bearer/API-key auth middleware for protected endpoints.
- Add request IDs, JSON error envelopes, structured logging, and handler helpers.
- Keep the package boundaries channel-aware but implement only Email in v1.

## Acceptance Criteria

- WHEN `docker compose --profile app up notification` is run, THEN Notification Service starts and passes health checks.
- WHEN `GET /healthz` is called, THEN the service returns `200`.
- WHEN protected endpoints are called without API credentials, THEN a stable unauthorized error envelope is returned.
- WHEN the worker binary starts without required configuration, THEN it fails fast with a clear configuration error.
- WHEN code is reviewed, THEN package layout matches established Go service patterns.

## Regression / Compatibility Tests

- Tina SHALL verify app, booking, users, courses, payments, and notification services still start under the app profile.
- Tina SHALL add service startup, health check, readiness, and auth middleware tests.

## Out Of Scope

Notification persistence, provider delivery, and business-service integrations.
