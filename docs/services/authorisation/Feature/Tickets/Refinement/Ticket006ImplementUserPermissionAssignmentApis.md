# 006 - Implement User Permission Assignment APIs

## Feature / Component

- Feature: Authorisation Service
- Component: User role assignments and direct permission assignments
- Priority: P0
- Status: Implemented
- Branch: `feature/authorisation-user-assignments`
- Developer owner: Platform Backend Developer
- Test owner: Test Engineer
- Dependencies: Ticket005ImplementPermissionAndRoleManagementApis
- Source PRD: `docs/services/authorisation/product.md`

## Task

Implement scoped user role assignment APIs and scoped direct user permission assignment APIs, including delegation safety rules.

## Implementation Notes

- Implement:
  - `POST /v1/users/{user_id}/roles`
  - `DELETE /v1/users/{user_id}/roles/{assignment_id}`
  - `GET /v1/users/{user_id}/roles`
  - `POST /v1/users/{user_id}/permissions`
  - `DELETE /v1/users/{user_id}/permissions/{assignment_id}`
  - `GET /v1/users/{user_id}/permissions`
- Request body must support:
  - `organisation_id`
  - `application_id`
  - `resource_type`
  - `resource_id`
  - `assigned_by`
- Direct user permission assignments must support `ALLOW` and `DENY`.
- Call database functions/procedures for assignment persistence; do not embed table-level SQL in Go service code.
- Enforce delegation rules:
  - actor cannot assign role above actor maximum assignable level
- Permission assignment is controlled by Authorisation administration permissions and scope, not permission levels.
- Record audit events for assignment and removal operations.

## Acceptance Criteria

- WHEN a role assignment is created, THEN it is scoped correctly and returned in user role list.
- WHEN a direct user permission assignment is created, THEN it is scoped correctly and returned in the user permission list.
- WHEN a direct user deny assignment exists, THEN it is available for effective permission calculation.
- WHEN actor attempts to assign a role above delegated level, THEN the API rejects the request.
- WHEN assignments are removed, THEN audit events are recorded.
- WHEN code is reviewed, THEN assignment APIs contain no table-level inline SQL.

## Regression / Compatibility Tests

- Test Engineer SHALL add API tests for scoped role assignment and removal.
- Test Engineer SHALL add API tests for direct user `ALLOW` and `DENY` permission assignments.
- Test Engineer SHALL add delegation violation tests.

## Out Of Scope

- Effective permission resolution endpoint.
- RollFinders integration.
