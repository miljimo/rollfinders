# 002 - Bootstrap Authorisation Service Runtime

## Feature / Component

- Feature: Authorisation Service
- Component: Go service scaffold, config, health, and local runtime
- Priority: P0
- Status: Implemented
- Branch: `feature/authorisation-service-bootstrap`
- Developer owner: Platform Backend Developer
- Test owner: Test Engineer
- Dependencies: Ticket001FinaliseAuthorisationBoundaryAndPermissionCatalog
- Source PRD: `apps/backend_api/internal/services/authorisation/docs/product.md`

## Task

Create the Authorisation Service runtime scaffold using the existing Go service patterns in this repository.

## Implementation Notes

- Add Go module and service entrypoint under `services/authorisation`.
- Follow existing service conventions from `services/users`, `services/payments`, and `services/booking`.
- Add configuration for:
  - API key/internal auth
  - database connection
  - environment name
  - service port
- Add health/readiness endpoints.
- Add structured access logging consistent with existing Go services.
- Add Dockerfile and local compose support if required by repo convention.
- Do not implement permission-management business endpoints in this ticket.

## Acceptance Criteria

- WHEN the service starts locally, THEN health and readiness endpoints respond successfully.
- WHEN internal auth is missing or invalid for protected routes, THEN the service rejects requests consistently with existing service patterns.
- WHEN service logs are reviewed, THEN requests include method, path, status, and duration.
- WHEN local compose is used, THEN the service can connect to its database.

## Regression / Compatibility Tests

- Test Engineer SHALL run Go unit tests for the new service.
- Test Engineer SHALL verify existing service tests are unaffected.

## Out Of Scope

- Permission schema.
- Authorisation decision logic.
- Users Service migration.
