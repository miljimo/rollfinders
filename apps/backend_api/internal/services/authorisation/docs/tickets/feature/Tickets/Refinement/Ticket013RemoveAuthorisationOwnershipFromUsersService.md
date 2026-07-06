# 013 - Remove Authorisation Ownership From Users Service

## Feature / Component

- Feature: Users Service Authorisation Migration
- Component: Authorisation removal and compatibility cleanup
- Priority: P2
- Status: Partially Implemented
- Branch: `feature/users-service-remove-authorisation`
- Developer owner: Users Backend Developer
- Test owner: Test Engineer
- Dependencies: Ticket009CutOverPermissionTablesToAuthorisationSourceOfTruth, Ticket011ReplaceRollFindersHardcodedRoleGuards, Ticket012EnforceAuthorisationInDomainServices
- Source PRD: `apps/backend_api/internal/services/authorisation/docs/product.md`

## Task

Remove authorisation ownership from Users Service after callers have migrated to Authorisation Service.

## Implementation Notes

- Remove or deprecate Users Service endpoints for:
  - roles
  - permissions
  - role permissions
  - user roles
  - user permissions
- Stop exposing effective privileges as a canonical authorisation source.
- Stop using Users Service `user_has_privilege` for access control.
- Remove or disable any remaining Users Service write path to role, permission, role-permission, user-role, or user-permission tables.
- Keep authentication, identity, sessions, MFA, credentials, password reset, and user profile APIs.
- Keep compatibility fields only where still required by existing auth/session contracts.
- Document any retained legacy fields as non-authoritative for authorisation.

## Acceptance Criteria

- WHEN Users Service API docs are reviewed, THEN Users Service no longer claims authorisation ownership.
- WHEN Users Service code is reviewed, THEN authentication and identity still work.
- WHEN authorisation data is requested, THEN callers use Authorisation Service.
- WHEN role, permission, or assignment writes are attempted through Users Service, THEN they are rejected or unavailable.
- WHEN legacy role fields remain, THEN they are documented as compatibility only.

## Regression / Compatibility Tests

- Test Engineer SHALL run Users Service auth, account, session, MFA, and password reset tests.
- Test Engineer SHALL run RollFinders login and dashboard smoke tests.
- Test Engineer SHALL verify Authorisation Service handles role and permission management after removal.

## Out Of Scope

- Removing user identity fields.
- Removing session role compatibility before frontend/session migration is complete.
