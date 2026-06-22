# 005 - Implement Permission And Role Management APIs

## Feature / Component

- Feature: Authorisation Service
- Component: Permission, role, and role-permission APIs
- Priority: P0
- Branch: `feature/authorisation-role-permission-apis`
- Developer owner: Platform Backend Developer
- Test owner: Test Engineer
- Dependencies: Ticket004ImplementAuthorisationDatabaseSchema
- Source PRD: `services/authorisation/docs/product.md`

## Task

Implement APIs to create, list, read, and update permissions and roles, plus APIs to assign and remove permissions from roles.

## Implementation Notes

- Implement:
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
- Validate permission codes use approved naming convention.
- Enforce role level fields.
- Permissions must not have numeric level fields.
- Record audit events for create/update/assign/remove operations.
- Use stable error responses from the OpenAPI contract.
- Call database functions/procedures for persistence; do not embed `SELECT`, `INSERT`, `UPDATE`, or `DELETE` statements in Go service code.
- Do not implement user assignments in this ticket.

## Acceptance Criteria

- WHEN a permission is created, THEN it is persisted with code, name, and description.
- WHEN a role is created, THEN it is persisted with key, name, description, level, and assignability.
- WHEN a permission is assigned to a role, THEN it appears in the role permission list.
- WHEN a role permission is removed, THEN it no longer contributes to effective permissions.
- WHEN invalid permission code format is submitted, THEN the API returns a validation error.
- WHEN code is reviewed, THEN permission and role APIs contain no table-level inline SQL.

## Regression / Compatibility Tests

- Test Engineer SHALL add API tests for permission CRUD, role CRUD, role permission assignment, and removal.
- Test Engineer SHALL test audit events are written for mutations.

## Out Of Scope

- User role assignments.
- `POST /v1/authorize`.
