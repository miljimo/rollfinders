# 004 - Implement Authorisation Database Schema

## Feature / Component

- Feature: Authorisation Service
- Component: PostgreSQL schema and migrations
- Priority: P0
- Branch: `feature/authorisation-database-schema`
- Developer owner: Platform Backend Developer
- Test owner: Test Engineer
- Dependencies: Ticket002BootstrapAuthorisationServiceRuntime, Ticket003DefineAuthorisationOpenApiContract
- Source PRD: `services/authorisation/docs/product.md`

## Task

Implement the Authorisation Service database schema for permissions, roles as permission bundles, role permissions, user roles, direct user permission assignments, and audit history.

## Implementation Notes

- Add migrations under the Authorisation Service migration framework.
- Create and own the PostgreSQL schema `authorisation`.
- Ensure all Authorisation tables, functions, procedures, indexes, and audit records are created under the `authorisation` schema.
- Define database functions and stored procedures for every data operation. Runtime Go code must not embed table-level SQL for reads, writes, joins, authorisation decisions, or migration writes.
- Create tables:
  - `permissions`
  - `roles`
  - `role_permissions`
  - `user_roles`
  - `user_permissions`
  - `authorisation_audit_events`
- Support scope columns on user role assignments and direct user permission assignments:
  - `organisation_id`
  - `application_id`
  - `resource_type`
  - `resource_id`
- Support `ALLOW` and `DENY` effects for direct user permission assignments.
- Add indexes for:
  - permission code lookup
  - role key lookup
  - user role lookup by user and scope
  - user permission lookup by user, permission, and scope
  - audit lookup by actor, target user, and created date
- Add seed data for the initial RollFinders permission catalog and legacy-compatible system roles.

## Acceptance Criteria

- WHEN migrations run on an empty database, THEN all Authorisation Service tables are created.
- WHEN schema ownership is reviewed, THEN Authorisation objects exist under `authorisation`, not `public`.
- WHEN seed data runs, THEN initial permissions and system roles exist.
- WHEN direct user permission assignments are inserted, THEN `ALLOW` and `DENY` effects are supported.
- WHEN scope fields are queried, THEN indexes support user and permission lookups.
- WHEN runtime code is reviewed, THEN all data operations are performed through database functions or stored procedures.

## Regression / Compatibility Tests

- Test Engineer SHALL run migration tests on a clean database.
- Test Engineer SHALL verify migrations can be re-run idempotently where repo conventions require it.

## Out Of Scope

- API handlers.
- Migration from Users Service data.
