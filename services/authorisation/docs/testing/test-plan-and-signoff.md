# Authorisation Service Test Plan And Sign-Off

## Scope

This plan covers the Test Engineer ownership for making Authorisation Service the single source of permission truth.

Primary test ownership:

- Authorisation Service unit, API, and integration tests.
- Static regression checks that runtime Go code does not embed table-level SQL for Authorisation data access.
- Migration verification from Users Service roles, privileges, role privileges, user roles, and user permissions.
- Cutover verification that Users Service can no longer mutate authoritative role or permission records.
- Static regression checks preventing hardcoded role guards in migrated RollFinders areas.
- Sign-off evidence for each staged ticket.

## Current Repository State

`services/authorisation` now contains a Go runtime, OpenAPI contract, SQL migration, service tests, and a Users Service authorisation-data translation command.

The first runnable Node contract slice lives in the existing Node test suite:

- `src/lib/__tests__/authorisation-service-contracts.test.ts`
- `src/lib/__tests__/authorisation-static-regressions.test.ts`
- `services/authorisation/docs/testing/migrated-role-guard-areas.json`

These tests model the required decision semantics and migration equivalence. Keep them as RollFinders contract fixtures alongside the Authorisation Service Go tests.

## Coverage By Ticket

### Tickets 002-004: Runtime, OpenAPI, Database

- Health and readiness endpoint tests.
- Internal service auth rejection tests for protected routes.
- OpenAPI validation against repository tooling, once the contract file exists.
- Clean database migration test for `permissions`, `roles`, `role_permissions`, `user_roles`, `user_permissions`, and `authorisation_audit_events`.
- Stored function/procedure coverage for every runtime data operation.
- Seed verification for the initial permission catalog and system roles.

### Tickets 005-006: Management And Assignment APIs

- Permission CRUD tests, including invalid permission code format.
- Role CRUD tests, including level and assignability fields.
- Role permission assignment and removal tests.
- Scoped user role assignment and removal tests.
- Direct user permission `ALLOW` and `DENY` assignment tests.
- Delegation violation tests for role levels.
- Audit event tests for every mutation.

### Ticket 007: Decision Engine

Required unit and API cases:

- Role permission allow in matching scope.
- Direct user permission allow.
- Direct user deny wins over role allow and direct allow.
- Scope mismatch denies.
- Unknown permission fails closed.
- Unknown or missing user fails closed.
- Effective permissions include only permissions valid for requested scope.

### Ticket 008: Users Service Data Translation

Migration verification must compare:

- Legacy `privileges` count to Authorisation `permissions`.
- Legacy `roles` count to Authorisation `roles`.
- Legacy `role_privileges` count to Authorisation `role_permissions`.
- Legacy `user_roles` count to Authorisation `user_roles`.
- Legacy `user_permissions` count to Authorisation `user_permissions`.
- Representative effective access outcomes for platform admin, super admin, academy admin, and standard user fixtures.

The migration must be idempotent: a second run must not duplicate roles, permissions, role permissions, user roles, or direct user permissions.

### Ticket 009: Cutover

Cutover tests must prove:

- Role, permission, role-permission, user-role, and user-permission writes succeed through Authorisation Service.
- Equivalent writes through Users Service are rejected, unavailable, or blocked by database/code guards after cutover.
- Users Service authentication, login, sessions, MFA, password reset, and profile flows still pass.
- Rollback runbook steps identify when Users Service write authority may temporarily be restored for operational recovery.

### Tickets 010-012: RollFinders And Domain Enforcement

- RollFinders helper tests proving callers request permission and explicit scope.
- Compatibility fallback tests while fallback is enabled.
- Deny and service-unavailable fail-closed tests for protected workflows.
- Static tests for migrated files listed in `migrated-role-guard-areas.json`.
- Domain service integration tests for allow, deny, missing scope, and Authorisation Service unavailable.

### Tickets 013-014: Cleanup And Regression Suite

- Users Service API/docs no longer expose role or permission management as authoritative.
- No active Users Service write path remains for legacy authorisation tables.
- Users Service `effective_privileges_list` and `user_has_privilege` are not used by migrated access-control code.
- CI runs the Authorisation Service tests, migration contracts, Users Service auth tests, and RollFinders targeted regression tests.

## Static Role Guard Regression Process

The repository still contains known legacy role guards. Do not add all files to the static check until they are migrated.

When a file moves to permission-first authorisation:

1. Add its path to `services/authorisation/docs/testing/migrated-role-guard-areas.json`.
2. Run `npm run test:unit`.
3. Fix any hardcoded role guard match in that file by using the permission helper.

The static test blocks these patterns in migrated files:

- `isSuperAdminRole(...)`
- `isPlatformAdminRole(...)`
- `isAcademyAdminRole(...)`
- direct `Role.SUPER_ADMIN`, `Role.PLATFORM_ADMIN`, `Role.ACADEMY_ADMIN`, and related role-name constants
- direct role string equality/inequality checks

## Local Commands

Run the first slice:

```sh
npm run test:unit
```

Run related existing service tests:

```sh
npm run users:test
npm run payments:test
```

Run the Authorisation Service tests:

```sh
npm run authorisation:test
```

Run the Users Service translation job against local databases:

```sh
DATABASE_URL=postgres://postgres:postgres@localhost:54322/rollfinder?sslmode=disable \
USERS_DATABASE_URL=postgres://postgres:postgres@localhost:54322/rollfinder?sslmode=disable \
npm run authorisation:migrate-users
```

## Sign-Off Checklist

- [ ] Product boundary reviewed: Users Service owns identity only; Authorisation Service owns permission truth.
- [ ] OpenAPI contract includes all PRD endpoints and stable denial/error reasons.
- [ ] Database migrations create all Authorisation Service tables and indexes.
- [ ] Permission/role APIs pass CRUD, validation, delegation, and audit tests.
- [ ] Assignment APIs pass scoped role/direct permission allow and deny tests.
- [ ] `POST /v1/authorize` passes allow, deny, deny precedence, scope mismatch, and fail-closed tests.
- [ ] Effective permissions are filtered by requested scope.
- [ ] Users Service migration verification proves row-count and effective-access equivalence.
- [ ] Migration is idempotent.
- [ ] Cutover blocks Users Service writes to authoritative permission records.
- [ ] Authorisation runtime and migration commands contain no table-level inline SQL; all data operations go through stored functions/procedures.
- [ ] RollFinders migrated areas are listed in the static guard manifest.
- [ ] Domain services fail closed for protected operations when denied or missing scope.
- [ ] CI includes the Authorisation Service suite and migration/cutover contracts.

## Remaining Implementation Gaps

- Run the SQL migration and Users Service translation job against real local or CI Postgres databases.
- Refactor current Authorisation runtime repository and migration command so operational SQL is moved into database functions/procedures. Enable `authorisation-no-inline-sql.test.ts` once complete.
- Add concrete cutover enforcement in Users Service so legacy permission tables cannot be mutated after Ticket009.
- Add more route-by-route RollFinders migrations to `migrated-role-guard-areas.json` as hardcoded role guards are replaced.
