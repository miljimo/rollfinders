# 003 - Define Authorisation OpenAPI Contract

## Feature / Component

- Feature: Authorisation Service
- Component: OpenAPI and API contract
- Priority: P0
- Branch: `feature/authorisation-openapi-contract`
- Developer owner: API Developer
- Test owner: Test Engineer
- Dependencies: Ticket001FinaliseAuthorisationBoundaryAndPermissionCatalog
- Source PRD: `services/authorisation/docs/product.md`

## Task

Define the Authorisation Service OpenAPI contract for permission management, role management, user permission assignments, effective permissions, and authorisation checks.

## Implementation Notes

- Add endpoints:
  - `POST /v1/permissions`
  - `GET /v1/permissions`
  - `GET /v1/permissions/{permission_id}`
  - `PUT /v1/permissions/{permission_id}`
  - `POST /v1/roles`
  - `GET /v1/roles`
  - `GET /v1/roles/{role_id}`
  - `PUT /v1/roles/{role_id}`
  - `POST /v1/roles/{role_id}/permissions`
  - `DELETE /v1/roles/{role_id}/permissions/{permission_id}`
  - `GET /v1/roles/{role_id}/permissions`
  - `POST /v1/users/{user_id}/roles`
  - `DELETE /v1/users/{user_id}/roles/{assignment_id}`
  - `GET /v1/users/{user_id}/roles`
  - `POST /v1/users/{user_id}/permissions`
  - `DELETE /v1/users/{user_id}/permissions/{assignment_id}`
  - `GET /v1/users/{user_id}/permissions`
  - `POST /v1/authorize`
  - `GET /v1/users/{user_id}/effective-permissions`
- Define request and response schemas for scope fields:
  - `organisation_id`
  - `application_id`
  - `resource_type`
  - `resource_id`
- Define stable error codes for missing permissions, invalid scope, unknown user, unknown role, unknown permission, and delegation violations.
- Keep authentication as internal service auth, not user login.

## Acceptance Criteria

- WHEN the OpenAPI is reviewed, THEN every PRD endpoint is represented.
- WHEN `POST /v1/authorize` is reviewed, THEN it accepts subject, permission, organisation, application, and resource scope.
- WHEN assignment endpoints are reviewed, THEN they support scoped user roles and scoped direct user permission assignments.
- WHEN errors are reviewed, THEN delegation and permission failures have stable error codes.

## Regression / Compatibility Tests

- Test Engineer SHALL validate the OpenAPI file with the project’s OpenAPI validation tooling if available.
- Test Engineer SHALL verify no endpoint requires Users Service to own authorisation.

## Out Of Scope

- Endpoint implementation.
- Database implementation.
