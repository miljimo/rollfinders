# 014 - Add Authorisation Regression Suite And Migration Contracts

## Feature / Component

- Feature: Authorisation Service
- Component: Regression, migration, and static contract tests
- Priority: P1
- Status: Partially Implemented
- Branch: `feature/authorisation-regression-suite`
- Developer owner: Test Engineer
- Test owner: Test Engineer
- Dependencies: Ticket007ImplementAuthorizeAndEffectivePermissionsApis, Ticket009CutOverPermissionTablesToAuthorisationSourceOfTruth, Ticket010AddRollFindersAuthorisationClientAndCompatibilityHelper
- Source PRD: `apps/backend_api/internal/services/authorisation/docs/product.md`

## Task

Add regression coverage proving the Authorisation Service preserves current access behaviour while migrating from hardcoded role guards and Users Service legacy authorisation data.

## Implementation Notes

- Add Authorisation Service unit tests for:
  - role permission allows
  - direct allow
  - direct deny
  - deny precedence
  - scope matching
  - unknown permission fail-closed
  - delegation level violations
- Add API tests for:
  - permission CRUD
  - role CRUD
  - user assignments
  - direct user permission assignments
  - `POST /v1/authorize`
  - effective permissions
- Add migration contract tests comparing legacy Users Service access outcomes with Authorisation Service effective permissions during translation phase.
- Add cutover contract tests proving Authorisation Service is the only writable permission source after Ticket009.
- Add RollFinders static tests to prevent new hardcoded role guards in migrated areas.

## Acceptance Criteria

- WHEN Authorisation Service tests run, THEN decision logic is covered for allow, deny, direct user permission assignments, and scope mismatch.
- WHEN migration tests run, THEN translated permissions match existing Users Service access outcomes for representative users.
- WHEN cutover tests run, THEN Users Service cannot create or mutate authoritative permission records.
- WHEN RollFinders static tests run, THEN new role-name guard regressions are caught in migrated areas.
- WHEN CI runs, THEN authorisation tests are part of the relevant service test command.

## Regression / Compatibility Tests

- Test Engineer SHALL run Authorisation Service unit and API tests.
- Test Engineer SHALL run Users Service auth tests.
- Test Engineer SHALL run RollFinders typecheck and targeted admin/dashboard tests.

## Out Of Scope

- Implementing the Authorisation Service APIs.
- Removing legacy code.
