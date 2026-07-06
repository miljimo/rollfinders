# 001 - Bootstrap Go API Service

## Feature / Component

- Feature: Platform Foundation
- Component: App runtime
- Priority: P0
- Suggested owner: Lead Software Engineer
- Dependencies: None

## Task

Create the initial Go service foundation with configuration, routing, health endpoints, structured startup behavior, and graceful shutdown.

## Implementation Notes

- Create a Go module and minimal service entrypoint.
- Read configuration from environment variables only.
- Expose liveness and readiness endpoints.
- Keep the application process stateless.

## Acceptance Criteria

- WHEN the service starts, THEN it reads all runtime configuration from environment variables.
- WHEN `GET /healthz` is called, THEN it returns `200` without requiring database access.
- WHEN `GET /readyz` is called and PostgreSQL is reachable, THEN it returns `200`.
- IF PostgreSQL is unreachable, THEN `GET /readyz` returns a non-`200` response.
- WHEN the process receives SIGTERM, THEN it shuts down gracefully without accepting new requests.

## Out Of Scope

Payment endpoints, provider integrations, persistence schema beyond readiness checks.
