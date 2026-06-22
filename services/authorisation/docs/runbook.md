# Authorisation Service Runbook

## Local runtime

Required environment:

```text
PORT=8080
DATABASE_URL=postgres://postgres:postgres@localhost:54322/rollfinder?sslmode=disable
USERS_DATABASE_URL=postgres://postgres:postgres@localhost:54322/rollfinder?sslmode=disable
```

Run the service:

```sh
cd services/authorisation
go run ./cmd/api
```

Health endpoints:

```text
GET /healthz
GET /readyz
```

Service-to-service authentication is handled by the orchestration layer. The authorisation service does not require an internal API key header.

## Migration and cutover hooks

1. Apply `migrations/001_core_schema.sql` to the Authorisation database.
2. Run the Users Service translation job for legacy roles, privileges, role mappings, user roles, and direct user permissions. Legacy privileges must be inserted as Authorisation permissions, not retained as a target-state concept.

```sh
DATABASE_URL=postgres://postgres:postgres@localhost:54322/rollfinder?sslmode=disable \
USERS_DATABASE_URL=postgres://postgres:postgres@localhost:54322/rollfinder?sslmode=disable \
npm run authorisation:migrate-users
```

3. Verify Authorisation effective permissions for representative users against legacy Users Service outcomes.
4. Freeze Users Service writes to `roles`, `privileges`, `role_privileges`, `user_roles`, and `user_permissions`.
5. Route role, permission, role-permission, user-role, and user-permission writes to Authorisation Service APIs.
6. Record the cutover timestamp and migration verification report location.

Rollback before downstream migration completion is to unfreeze the legacy Users Service write paths and stop routing writes to Authorisation Service. After downstream services depend on Authorisation Service decisions, rollback requires restoring Authorisation data from backup and replaying audited changes.
