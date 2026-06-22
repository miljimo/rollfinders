# Product Requirements Document (PRD)

# Users Identity & Authentication Service

## Document Information

| Field | Value |
| --- | --- |
| Product | Users Service |
| Version | 1.1 |
| Status | Draft |
| Audience | Product Managers, Architects, Backend Engineers, API Developers |
| Database | PostgreSQL `users` schema in the shared RollFinders database |
| Architecture | Identity and authentication service |

## 1. Overview

The Users Service owns user identity, credentials, authentication sessions, password reset, MFA, user profile state, organisation records currently implemented in the Users schema, and organisation membership records.

The Users Service no longer owns roles, permissions, role-permission mappings, user-role assignments, direct user permissions, or effective permission evaluation. Those responsibilities belong to the Authorisation Service.

## 2. Ownership Boundaries

Users Service owns:

* users
* credentials and credential secrets
* sessions and refresh tokens
* password reset tokens
* MFA methods
* user profile/status/protected-account state
* current implementation baseline for organisations and `organisation_users`
* user-management audit logs

RollFinders public Prisma schema shall not own or mirror a `users` table. Domain tables may store user identifiers as text references, but canonical user records must live in the Users Service schema.

Authorisation Service owns:

* roles
* permissions
* role-permission mappings
* user-role assignments
* direct user-permission assignments
* effective permission resolution
* role and permission management APIs

Application/API Gateway responsibilities:

* call Authorisation Service for access decisions
* pass `user_id`, `organisation_id`, `application_id`, and resource scope where applicable
* avoid hardcoded role guards in new code

## 3. Objectives

Business goals:

* Centralize user identity and authentication.
* Keep authentication independent from permission policy.
* Support one user account across organisations and academy locations.
* Preserve current RollFinders login and user-management workflows during authorisation cutover.

Technical goals:

* Secure user identities and credentials.
* Use stored procedures/functions for all database operations.
* Keep the Users schema free of permission ownership tables after migration.
* Integrate with Authorisation Service for role and permission decisions.
* Support future SSO, OIDC, SAML, SCIM, and passkeys without reintroducing RBAC ownership.

## 4. Functional Requirements

FR-001 User Management:

* System shall allow create, read, update, deactivate, reactivate, and delete user identities.
* User attributes shall include `id`, `email`, optional `username`, `first_name`, `last_name`, optional `phone`, status, protected-account flag, created timestamp, and updated timestamp.
* User create/update APIs shall not write role assignments.

FR-002 Authentication:

* System shall support email login, username login, password validation, password reset, password change, account disablement, sessions, and refresh tokens.
* Future support includes SSO, OAuth2, OpenID Connect, SAML, SCIM, MFA expansion, and passkeys.

FR-003 Organisation Records:

* System shall continue to expose the current `/v1/organisations` baseline while Organisation Service extraction is staged.
* System shall support organisation creation/update only for platform-controlled flows, not public RollFinders self-serve organisation creation.

FR-004 Organisation Membership:

* System shall keep `organisation_users` as the current membership baseline.
* Organisation membership shall not imply a role or permission.
* Access to an organisation resource shall be decided by Authorisation Service permissions scoped to the relevant organisation/application/resource.

FR-005 Role and Permission Cutover:

* Users Service shall not create, update, delete, or list roles.
* Users Service shall not create, update, delete, or list permissions.
* Users Service shall not create, update, delete, or list user-role assignments.
* Users Service shall not create, update, delete, or list direct user-permission assignments.
* Legacy Users authorisation tables shall be dropped after data is migrated into the Authorisation Service.

FR-006 Compatibility Fields:

* Users APIs may temporarily return compatibility fields such as `role` and `privileges` where existing RollFinders callers still require them.
* Compatibility role values are not authoritative and shall not be used for new access decisions.
* `privileges` shall be returned as an empty compatibility array from Users; callers shall query Authorisation Service for permissions.

FR-007 Audit Logging:

* System shall record identity/authentication/user-management actions.
* Role and permission audit events shall be recorded by Authorisation Service.

## 5. API Requirements

Users:

```http
POST   /v1/users
GET    /v1/users
GET    /v1/users/{id}
PUT    /v1/users/{id}
DELETE /v1/users/{id}
POST   /v1/users/{id}/disable
POST   /v1/users/{id}/enable
```

Authentication:

```http
POST   /v1/auth/credentials
POST   /v1/auth/password-reset/request
POST   /v1/auth/password-reset/validate
POST   /v1/auth/password-reset/confirm
POST   /auth/register
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh
POST   /auth/change-password
```

Organisations:

```http
POST   /v1/organisations
GET    /v1/organisations
GET    /v1/organisations/{id}
PUT    /v1/organisations/{id}
```

Removed from Users Service:

```http
POST   /v1/roles
GET    /v1/roles
POST   /v1/permissions
GET    /v1/permissions
POST   /v1/roles/{id}/permissions
GET    /v1/roles/{id}/permissions
POST   /v1/users/{id}/roles
GET    /v1/users/{id}/roles
DELETE /v1/users/{id}/roles/{roleId}
```

These APIs belong to Authorisation Service.

## 6. Database Model

Users schema tables:

```text
users
credentials
credential_secrets
sessions
refresh_tokens
password_reset_tokens
mfa_methods
organisations
organisation_users
admin_audit_logs
schema_migrations
```

Removed from Users schema:

```text
roles
privileges
role_privileges
user_roles
user_permissions
```

Removed from RollFinders public schema:

```text
users
academy_member_profiles
```

## 7. Migration Requirements

* Migrate existing Users role and privilege data into the Authorisation Service before cleanup.
* Verify Authorisation Service row counts are at least equal to legacy Users authorisation row counts.
* Drop legacy Users authorisation functions, procedures, and tables after migration.
* Do not reintroduce Users-owned role tables in future migrations.

## 8. Non-Functional Requirements

* Passwords shall be hashed using a strong one-way password hashing algorithm.
* HTTPS is required outside local development.
* JWT authentication and refresh tokens are supported.
* Database operations shall go through stored procedures/functions.
* Users APIs shall not perform permission evaluation locally.

## 9. Success Metrics

| Metric | Target |
| --- | --- |
| User Creation Success Rate | >99% |
| Login Success Rate | >99% |
| API Availability | 99.9% |
| Password Reset Completion | >95% |
| Users-owned permission tables after cleanup | 0 |
