# 007 - Implement Authorize And Effective Permissions APIs

## Feature / Component

- Feature: Authorisation Service
- Component: Decision engine and effective permissions
- Priority: P0
- Status: Implemented
- Branch: `feature/authorisation-decision-engine`
- Developer owner: Platform Backend Developer
- Test owner: Test Engineer
- Dependencies: Ticket006ImplementUserPermissionAssignmentApis
- Source PRD: `apps/backend_api/internal/services/authorisation/docs/product.md`

## Task

Implement the effective permission resolution engine and the `POST /v1/authorize` API.

## Implementation Notes

- Implement:
  - `POST /v1/authorize`
  - `GET /v1/users/{user_id}/effective-permissions`
- Effective permission calculation:
  - role permissions provide allows
  - direct `ALLOW` adds permissions
  - direct `DENY` removes permissions
  - direct deny wins over all allows
- Scope matching must support platform, organisation, application, and resource-level checks.
- Effective permission calculation and authorisation decisions must be implemented in database functions, not inline SQL embedded in Go code.
- `POST /v1/authorize` must return:
  - `authorized`
  - `decision`
  - stable denial reason
- Unknown permission should deny by default.
- Missing user identity should deny by default.

## Acceptance Criteria

- WHEN a user has a role permission in matching scope, THEN `POST /v1/authorize` returns allow.
- WHEN a user has a direct allow in matching scope, THEN `POST /v1/authorize` returns allow.
- WHEN a user has a direct deny in matching scope, THEN `POST /v1/authorize` returns deny even if role allows.
- WHEN permission or user is unknown, THEN decision fails closed.
- WHEN effective permissions are requested, THEN response includes only permissions valid for the requested scope.
- WHEN code is reviewed, THEN decision APIs call stored functions for effective permission resolution.

## Regression / Compatibility Tests

- Test Engineer SHALL add unit tests for effective permission resolution.
- Test Engineer SHALL add API tests for allow, deny, direct user permission assignment, scope mismatch, unknown permission, and unknown user.

## Out Of Scope

- RollFinders client integration.
- Users Service legacy authorisation data migration.
