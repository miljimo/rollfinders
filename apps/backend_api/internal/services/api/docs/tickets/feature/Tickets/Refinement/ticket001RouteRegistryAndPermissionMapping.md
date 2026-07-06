# 001 - Route Registry And Permission Mapping

## Feature / Component

- Feature: API Orchestrator authorisation
- Component: Route registry
- Priority: P0
- Status: Implemented
- Branch: `feature/api-route-permission-registry`
- Developer owner: API Backend Developer
- Test owner: Test Engineer
- Dependencies: None
- Source PRD: `apps/backend_api/internal/services/api/docs/product.md`

## Task

Define every protected downstream route in an orchestrator-owned route registry with service, permission code, resource type, and resource id parameter metadata.

## Implementation Notes

- Implement `RouteDefinition`.
- Register protected routes in `services/api/internal/server/routes.go`.
- Keep permission codes in the orchestrator catalog, not downstream service code.
- Include route-derived `PermissionDefinition` entries for future catalog reconciliation.

## Acceptance Criteria

- WHEN a protected route is exposed, THEN it has an explicit route definition.
- WHEN a route has a resource id path parameter, THEN the route definition declares `ResourceType` and `ResourceIDParam`.
- WHEN the permission catalog is generated, THEN it derives entries from orchestrator route definitions.

## Implementation Evidence

- `services/api/internal/server/routes.go`
- `services/api/internal/server/routes_test.go`

## Out Of Scope

Calling Authorisation Service to create missing permission records.
