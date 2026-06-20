# 001 - Bootstrap Go API Service

## Feature / Component

- Feature: Platform Foundation
- Component: App runtime
- Priority: P0
- Suggested owner: Backend Engineer
- Branch name: `feature/booking-001-bootstrap-go-api-service`
- Dependencies: None

## Task

Create the initial booking service Go API runtime with routing, health endpoints, request IDs, structured startup logs, and graceful shutdown.

## Implementation Notes

- Create a Go module under `services/booking`.
- Add `cmd/api` entrypoint and internal server package.
- Read configuration from environment variables only.
- Expose `GET /healthz` and `GET /readyz`.
- Keep the service resource-agnostic.

## Acceptance Criteria

- WHEN the service starts, THEN it listens on the configured port.
- WHEN `GET /healthz` is called, THEN it returns `200` without database access.
- WHEN `GET /readyz` is called and dependencies are reachable, THEN it returns `200`.
- WHEN SIGTERM is received, THEN the server shuts down gracefully.

## Out Of Scope

Booking persistence, booking endpoints, service integrations.
