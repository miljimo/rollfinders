# 008 - Translate Existing Users Service Authorisation Data

## Feature / Component

- Feature: Authorisation Service Migration
- Component: Users Service legacy authorisation data translation
- Priority: P1
- Status: Partially Implemented
- Branch: `feature/authorisation-users-data-translation`
- Developer owner: Platform Backend Developer
- Test owner: Test Engineer
- Dependencies: Ticket007ImplementAuthorizeAndEffectivePermissionsApis
- Source PRD: `docs/services/authorisation/product.md`

## Task

Translate existing Users Service role and privilege data into Authorisation Service permissions without changing RollFinders behaviour. This prepares Authorisation Service to become the only source of permission truth.

## Implementation Notes

- Map Users Service `privileges` to Authorisation Service `permissions`; privileges must not remain a target-state concept.
- Map Users Service `roles` to Authorisation Service `roles`.
- Map Users Service `role_privileges` to Authorisation Service `role_permissions`.
- Map Users Service `user_roles` to Authorisation Service `user_roles`.
- Map Users Service `user_permissions` to Authorisation Service `user_permissions`.
- Read legacy Users Service data through Users Service functions where available, and write Authorisation data through Authorisation Service stored procedures.
- Do not embed cross-table migration SQL in Go migration commands.
- Preserve organisation scope where available.
- Preserve legacy role keys for compatibility, but new RollFinders code must use permissions.
- Add idempotent migration or sync mechanism according to service conventions.
- Produce a migration verification report that confirms row counts and effective access outcomes before Ticket009 cutover.
- Do not keep long-term dual-write between Users Service and Authorisation Service.
- No application behaviour should change in this ticket.

## Acceptance Criteria

- WHEN migration runs, THEN existing Users Service roles and privileges have been translated into Authorisation Service roles and permissions.
- WHEN migrated users are checked, THEN Authorisation Service effective permissions match the legacy Users Service access outcome for equivalent scope.
- WHEN migration is re-run, THEN duplicate roles, permissions, or assignments are not created.
- WHEN legacy roles are mirrored, THEN they are marked as compatibility/system roles where applicable.
- WHEN migration verification completes, THEN the Test Engineer has evidence that Authorisation Service can serve as permission source of truth.
- WHEN migration code is reviewed, THEN it contains no table-level inline SQL.

## Regression / Compatibility Tests

- Test Engineer SHALL compare legacy Users Service access outcomes with effective permissions from Authorisation Service for representative users.
- Test Engineer SHALL include academy admin, platform admin, super admin, and standard user fixtures.
- Test Engineer SHALL verify migrated row counts for roles, permissions, role permissions, user roles, and user permissions.

## Out Of Scope

- Removing Users Service legacy authorisation tables.
- Replacing RollFinders guards.
