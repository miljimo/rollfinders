# 009 - Cut Over Permission Tables To Authorisation Source Of Truth

## Feature / Component

- Feature: Authorisation Service Migration
- Component: Permission table ownership cutover
- Priority: P1
- Status: Partially Implemented
- Branch: `feature/authorisation-permission-table-cutover`
- Developer owner: Platform Backend Developer
- Test owner: Test Engineer
- Dependencies: Ticket008TranslateExistingUsersServiceAuthorisationData
- Source PRD: `docs/services/authorisation/product.md`

## Task

Move role, permission, role-permission, user-role, and user-permission ownership to Authorisation Service so it becomes the only authoritative permission source in the system.

## Implementation Notes

- Treat Authorisation Service tables as authoritative after Ticket008 translation has completed and been verified.
- Add a cutover migration or operational runbook that records the exact point where Authorisation Service becomes the source of truth.
- Ensure these legacy Users Service tables or equivalents are read-only, deprecated, or no longer written by application code after cutover:
  - `roles`
  - `privileges`
  - `role_privileges`
  - `user_roles`
  - `user_permissions`
- Route all role, permission, and assignment writes to Authorisation Service APIs.
- Keep Users Service authentication and identity tables untouched.
- Add database constraints, feature flags, or code guards where practical to prevent new permission writes to Users Service after cutover.
- Add rollback guidance that restores read/write ownership only if Authorisation Service cutover fails before downstream callers migrate.

## Acceptance Criteria

- WHEN new roles are created, THEN they are written only to Authorisation Service.
- WHEN new permissions are created, THEN they are written only to Authorisation Service.
- WHEN user roles or direct user permissions are assigned, THEN they are written only to Authorisation Service.
- WHEN Users Service code is reviewed, THEN no active write path remains for permission ownership tables.
- WHEN Authorisation Service data is queried after cutover, THEN it contains all migrated permission data required by RollFinders.
- WHEN the cutover runbook is reviewed, THEN it includes verification, failure handling, and rollback steps.

## Regression / Compatibility Tests

- Test Engineer SHALL run migration verification against representative users before and after cutover.
- Test Engineer SHALL verify Users Service auth, login, session, MFA, and profile flows still work.
- Test Engineer SHALL verify Authorisation Service handles permission, role, and assignment writes after cutover.
- Test Engineer SHALL verify no Users Service endpoint or job can mutate legacy permission tables after cutover.

## Out Of Scope

- Replacing all RollFinders route guards.
- Removing legacy Users Service tables from the database.
- Changing authentication/session ownership.
