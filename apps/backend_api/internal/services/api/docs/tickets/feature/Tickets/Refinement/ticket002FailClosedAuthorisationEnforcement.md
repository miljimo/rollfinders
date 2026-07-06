# 002 - Fail Closed Authorisation Enforcement

## Feature / Component

- Feature: API Orchestrator authorisation
- Component: Request enforcement
- Priority: P0
- Status: Implemented
- Branch: `feature/api-fail-closed-authorisation`
- Developer owner: API Backend Developer
- Test owner: Test Engineer
- Dependencies: Ticket001RouteRegistryAndPermissionMapping
- Source PRD: `apps/backend_api/internal/services/api/docs/product.md`

## Task

Enforce authentication and authorisation before forwarding any protected request to a downstream service.

## Implementation Notes

- Resolve route definition before authorisation.
- Resolve permission code from the route definition.
- Resolve resource type and resource id from path parameters.
- Pass subject, permission, application, organisation, resource type, and resource id to Authorisation Service.
- Fail closed when the route mapping is missing, resource resolution fails, Authorisation Service is unavailable, or the decision denies access.

## Acceptance Criteria

- WHEN an actor is missing, THEN the request is not forwarded.
- WHEN a route has no permission mapping, THEN the request returns `403`.
- WHEN Authorisation Service denies the request, THEN the request returns `403`.
- WHEN Authorisation Service allows the request, THEN the request is forwarded to the route's configured downstream service.

## Implementation Evidence

- `services/api/internal/server/authorisation.go`
- `services/api/internal/server/proxy.go`
- `services/api/internal/server/server_test.go`

## Out Of Scope

Creating missing permission records in Authorisation Service.
