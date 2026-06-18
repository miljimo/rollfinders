# PRD: User And Authentication Go Service Port

Version: 1.0

Priority: High

Status: Ready For Review

Branch:

```text
docs/user-auth-go-service-prds
```

---

# Objective

Port RollFinders user-management and credential-authentication ownership from the Next.js application into a dedicated Go service, following the operational pattern already established by the Go payment service.

The Next.js application SHALL remain the browser-facing backend-for-frontend for pages, forms, redirects, and NextAuth session cookies.

The Go user service SHALL own canonical user account reads, credential verification, admin user mutations, protected-account safeguards, and audit writes for user-management actions.

---

# Business Motivation

User and authentication management is security-sensitive platform infrastructure.

Moving this logic into a Go service gives RollFinders:

* a narrower internal API boundary for account operations
* a service architecture consistent with payments
* simpler future reuse by mobile apps, admin tooling, and background jobs
* reduced coupling between page rendering and account mutation rules
* clearer ownership of protected Super Admin safeguards

---

# Current State

Next.js currently owns:

* credential validation through NextAuth credentials provider
* password hash comparison
* user lookup and active/disabled checks
* standard-user academy membership checks
* admin user list, create, update, delete, enable, disable, promote, and demote APIs
* some user-management audit log writes
* protected-account checks

The payment domain already has a Go service with:

* service-local `Dockerfile`
* service-local `compose.yml`
* `healthz` and `readyz`
* static internal API-key authentication
* Postgres access through service configuration
* Next.js server-side service client integration

The user/auth service SHALL follow the same deployment and integration style unless this PRD explicitly says otherwise.

---

# Product Decision

RollFinders SHALL use a hybrid migration.

The Go service SHALL own user/account business rules and persistence operations.

Next.js SHALL continue to own:

* rendered pages
* public route handlers used by browsers
* NextAuth session issuance and callback shape
* redirect behavior
* forms and user-facing validation messages
* password reset email delivery until a separate communications-service PRD moves it

This preserves current UX while moving the high-risk account decision logic behind a service boundary.

---

# Out Of Scope

This PRD does not require:

* replacing NextAuth session cookies
* issuing first-party JWTs from the Go service
* moving password reset email templates into Go
* moving academy, event, course, or payment domain logic into the user service
* adding OAuth or social login
* changing the public login page design
* changing current role names or authorization semantics

---

# Service Boundary

The new service SHALL live under:

```text
services/users
```

The service SHALL expose:

* `GET /healthz`
* `GET /readyz`
* `POST /v1/auth/credentials`
* `GET /v1/accounts/{id}`
* `GET /v1/users`
* `POST /v1/users`
* `GET /v1/users/{id}`
* `PUT /v1/users/{id}`
* `DELETE /v1/users/{id}`
* `POST /v1/users/{id}/disable`
* `POST /v1/users/{id}/enable`
* `POST /v1/users/{id}/promote`
* `POST /v1/users/{id}/demote`

The exact endpoint contracts are defined in:

* `docs/features/Users/Shared/Products/Reviewing/UserAuthGoServiceApiPrd.md`
* `docs/features/Users/Shared/Products/Reviewing/UserManagementGoServiceApiPrd.md`

After this PRD was moved into the service tree, those sibling documents live at:

* `services/users/docs/Products/Reviewing/UserAuthGoServiceApiPrd.md`
* `services/users/docs/Products/Reviewing/UserManagementGoServiceApiPrd.md`

---

# Requirement 1: Payment-Service Parity

IF the user service is implemented

WHEN developers inspect the service structure

THEN it SHALL be organized similarly to `services/payments`.

The service SHALL include:

* `cmd/api/main.go`
* internal config loading
* internal HTTP server package
* service-local `go.mod`
* service-local `Dockerfile`
* service-local `compose.yml`
* health and readiness routes
* API-key middleware for internal service calls
* reused internal libraries copied from the payment service for:
  * HTTP routing and JSON handling under `internal/handlers`
  * Postgres access under `internal/databases`
  * environment access under `internal/environments`

---

# Requirement 1A: Migration Structure And Database API

IF the user service owns account read/write behavior

WHEN database migrations are added

THEN the migration structure SHALL match the Go payment service pattern:

```text
services/users/migrations/001_core_schema.sql
services/users/migrations/schema/
services/users/migrations/types/
services/users/migrations/tables/
services/users/migrations/functions/
services/users/migrations/procedures/
```

The user service SHALL define a service schema:

```text
users
```

The service schema SHALL contain service-owned SQL types, tables, functions, and procedures.

The user service SHALL own table creation for user-domain data so it can run as an independent service rather than depending on RollFinders Prisma migrations.

The initial service-owned tables SHALL include:

* `roles`
* `privileges`
* `role_privileges`
* `users`
* `password_reset_tokens`
* `academy_members`
* `academy_invitations`
* `admin_audit_logs`
* `platform_admin_profiles`

Foreign keys SHALL remain inside the `users` schema only for user-service-owned entities. Cross-service references, such as academy ids, SHALL be represented as text identifiers rather than foreign keys into RollFinders-owned tables.

The user service SHALL NOT create or own an `academies` table.

The user service SHALL NOT validate whether an academy id exists in an academy-owned database table during user creation. Academy existence validation belongs to the academy-owning service or RollFinders integration layer.

Platform-admin activity, rewards, weekly targets, and exemptions SHALL remain outside the user service because they are platform operations/productivity concerns, not account-management concerns.

Roles SHALL NOT be PostgreSQL enums or hard-coded authorization branches in application code.

Roles SHALL be rows in `users.roles`.

Privileges SHALL be rows in `users.privileges`.

Role capabilities SHALL be assigned through `users.role_privileges`.

The system MAY seed default roles and privileges, but authorization decisions SHALL be driven by those tables so operators can create roles and assign privileges without changing Go code.

All user-service writes SHALL be implemented as stored procedures.

Read models MAY be implemented as stable SQL functions, matching the payment service pattern for query operations.

Next.js and Go HTTP handlers SHALL NOT embed canonical account mutation SQL once the relevant procedure exists.

---

# Requirement 2: Data Ownership

IF a request modifies a user account

WHEN the request reaches the Go service

THEN the Go service SHALL perform the permission check and database mutation in the same service boundary.

Next.js SHALL NOT duplicate final authorization decisions for migrated user-management mutations.

Next.js MAY still perform preflight session checks to avoid unnecessary internal service calls.

---

# Requirement 3: Next.js Integration

IF the browser calls an existing Next.js user-management route

WHEN the route is migrated

THEN the route SHALL remain stable for the browser and delegate to the Go user service server-side.

Existing client-side pages SHALL NOT be required to call the Go service directly.

The Next.js service client SHALL read:

```text
USER_SERVICE_URL
USER_SERVICE_API_KEY
```

---

# Requirement 4: Authentication Integration

IF a user signs in with email and password

WHEN NextAuth invokes the credentials provider

THEN NextAuth SHALL call the Go service to verify credentials.

The Go service SHALL return only the user fields required to populate the NextAuth token and session:

* id
* email
* name
* role

NextAuth SHALL continue to issue and validate the session cookie.

---

# Requirement 5: Role And Permission Model

IF user-management behavior is migrated

WHEN roles and privileges are evaluated

THEN the user service SHALL evaluate privileges assigned to the actor's role.

The service SHALL support system-seeded default roles for compatibility, but those role names SHALL be data, not source-code authorization branches.

The service SHALL support custom roles created by the system or operators.

The service SHALL support assigning privileges to roles without redeploying the service.

The service SHALL preserve protected-account rules for any account with `is_protected = true`.

Protected-account behavior SHALL NOT depend on hard-coded email addresses.

---

# Requirement 6: Audit Logging

IF the Go service performs an admin user-management mutation

WHEN the mutation succeeds

THEN the Go service SHALL write the corresponding `admin_audit_logs` row.

Audit metadata SHALL include enough previous and next state to support admin review.

---

# Requirement 7: Deployment

IF the Go user service is introduced

WHEN local or deployed environments run the full application

THEN compose/deployment configuration SHALL run the user service alongside the web app and database.

The service SHALL support:

* `PORT`
* `DATABASE_URL` or `DB_*` variables
* `API_KEY`
* read timeout
* write timeout
* shutdown timeout

The root app compose environment SHALL provide:

```text
USER_SERVICE_URL=http://users:8080
USER_SERVICE_API_KEY=<shared internal secret>
```

---

# Requirement 8: Migration Safety

IF the migration is released

WHEN production traffic is moved to the Go service

THEN existing users SHALL keep their current passwords, roles, status, protected flags, academy relationships, audit history, and last-login semantics.

The migration SHALL NOT require a password reset for existing users.

---

# Acceptance Criteria

* `services/users` exists and builds independently with `go test ./...`.
* NextAuth credentials authentication delegates to the Go service.
* Current browser-facing auth and admin user routes remain stable.
* Admin user-management operations are authorized and persisted by the Go service.
* Protected Super Admin safeguards are enforced by the Go service.
* Admin user-management audit logs are written by the Go service.
* Local compose can run the web app, database, payment service, and user service together.
* Existing role-boundary tests are updated or added to cover the service-backed path.

---

# Rollout Plan

1. Add the Go user service behind environment configuration.
2. Add service-backed Next.js client functions.
3. Move NextAuth credential verification to the service.
4. Move `getCurrentUser` account-status reads to the service.
5. Move admin user list/detail/mutation routes to service delegation.
6. Run compatibility tests against existing admin and dashboard flows.
7. Deploy with the service enabled but keep browser-facing URLs unchanged.

---

# Open Questions

* Should password reset token creation remain in Next.js permanently, or move to a future communications/account service?
* Should the Go service expose OpenAPI documentation in the same style as payments?
* Should the service eventually own session issuance, or is NextAuth the long-term browser-session owner?
