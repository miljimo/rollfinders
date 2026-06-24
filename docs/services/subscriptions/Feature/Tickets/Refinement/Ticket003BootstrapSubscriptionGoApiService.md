# 003 - Bootstrap Subscription Go API Service

## Feature / Component

- Feature: Subscription Service
- Component: Go service foundation
- Priority: P0
- Branch: `feature/subscription-service-skeleton`
- Developer owner: Developer sub-agent
- Test owner: Tester sub-agent
- Dependencies: Ticket002DefineSubscriptionOpenApiContract
- Source PRD: `docs/services/subscriptions/product.md`

## Task

Create the runnable Subscription Service skeleton following the current backend API service patterns.

## Implementation Notes

- Add service entrypoint under `apps/backend_api/cmd/services/subscriptions/api`.
- Add internal packages under `apps/backend_api/internal/services/subscriptions` for config, environments, database, server/handlers, repository, requests, and responses.
- Add `GET /healthz` and `GET /readyz`.
- Add request ID middleware.
- Add internal API-key or trusted-service middleware consistent with existing services.
- Do not expose Subscription Service business routes directly to browser/mobile callers; they must be routed through the API gateway.
- Register protected Subscription Service routes in the API gateway route registry when each endpoint is implemented.
- Require gateway Authorisation Service checks for every business route before proxying.
- Add Dockerfile/container wiring if this repo's current service layout requires it.
- Add local compose wiring only after the service starts cleanly.
- Do not stub business endpoints as fake success.

## Acceptance Criteria

- WHEN `go test ./...` is run under `apps/backend_api`, THEN the new service compiles.
- WHEN the service starts locally, THEN health returns JSON.
- WHEN the database is reachable, THEN ready returns ready JSON.
- WHEN the database is unavailable, THEN ready fails closed.
- WHEN business routes are not implemented yet, THEN they return explicit not-implemented or are absent from runtime routing.
- WHEN a business route is registered through the gateway, THEN it has a permission code and is not public.

## Regression / Compatibility Tests

- Add basic service startup/config tests.
- Add health/readiness handler tests.

## Out Of Scope

Database schema and catalogue behavior.
