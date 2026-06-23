# 002 - Add Academy Permissions To Authorisation Catalog

## Feature / Component

- Feature: Academy Service
- Component: Authorisation permission catalog
- Priority: P0
- Branch: `feature/academy-authorisation-permissions`
- Developer owner: Authorisation Backend Developer
- Test owner: Tina Ugbekile, Test Engineer
- Dependencies: Ticket 001
- Source PRD: `services/academy/docs/product.md`

## Task

Add Academy Service permissions to the Authorisation Service catalog and seed procedure.

## Implementation Notes

- Add permissions from the PRD permission catalog using the `academy.*` naming pattern.
- Include lifecycle, profile, social, member mapping, claim, verification, invitation, reminder, analytics, audit, and payment capability permissions.
- Assign platform-level permissions to platform/super admin roles.
- Assign academy-scoped read/update permissions to academy owner/admin roles through Authorisation Service only.
- Keep role assignments in `authorisation.user_roles`; do not add role columns to Academy Service membership tables.
- Update authorisation docs and tests that validate seeded permission catalogs.

## Acceptance Criteria

- WHEN Authorisation migrations run, THEN all academy permissions exist.
- WHEN effective permissions are requested for platform admins, THEN platform review/manage academy permissions are present.
- WHEN effective permissions are requested for academy admins/owners with academy scope, THEN academy-scoped permissions are present.
- WHEN Academy Service checks protected routes, THEN it can reference stable permission names.

## Regression / Compatibility Tests

- Tina SHALL add catalog tests for new academy permissions.
- Tina SHALL verify existing users, courses, bookings, and payments permission checks still pass.

## Out Of Scope

Academy Service endpoint implementation.
