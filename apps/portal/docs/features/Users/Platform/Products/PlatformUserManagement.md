# Platform User Management & Protected Super Admin

## Feature ID

RF-006

## Priority

Critical

## Type

Platform Administration

---

# Objective

Provide a platform-wide user management system that allows the protected Super Admin account to:

* Create users
* Promote users
* Disable users
* Enable users
* Send password reset links to permitted lower users
* Manage platform access

The system must guarantee that the primary platform owner account can never be disabled, removed, locked, or downgraded.

This protects the platform from accidental lockout and administrative mistakes.

---

# Business Requirement

RollFinder requires delegated administration.

The platform owner must be able to create trusted users that help:

* Manage academies
* Manage open mats
* Moderate content
* Support users
* Help users regain account access when they lose their password

However, the primary Super Admin account must remain permanently protected.

---

# Protected Super Admin

The following account is the root owner account:

```text
admin@rollfinder.local
```

Role:

```text
SUPER_ADMIN
```

This account is protected.

The platform must prevent:

* Disable
* Delete
* Role change
* Demotion
* Lockout

for this account.

---

# User Roles

## SUPER_ADMIN

Platform owner.

Capabilities:

* Create users
* Disable users
* Enable users
* Promote users
* Demote users
* View audit logs
* Manage academies
* Manage open mats
* Manage claims
* Manage platform settings
* Send password reset links to lower users, including Platform Admins, Academy Admins, and Standard Users

Restrictions:

* Cannot disable protected Super Admin
* Cannot delete protected Super Admin
* Cannot change protected Super Admin role
* Cannot send password reset links for the protected Super Admin account

---

## PLATFORM_ADMIN

Capabilities:

* Manage academies
* Manage open mats
* Moderate content
* Manage claims
* View users
* Send password reset links to lower users they are allowed to manage

Restrictions:

* Cannot create Platform Admins
* Cannot manage Super Admins
* Cannot send password reset links for Super Admin, protected Super Admin, legacy Admin, or peer Platform Admin accounts
* Cannot access platform settings

---

## STANDARD_USER

Capabilities:

* Search academies
* View open mats
* View academy profiles

---

# User Status

Every user must have a status.

Valid statuses:

```text
ACTIVE
DISABLED
```

---

# Schema Impact

Schema changes are required for this PRD.

IF this PRD is implemented

WHEN the deployment is prepared

THEN database migration scripts SHALL be included in the same release as the user-management application code.

AND the migration SHALL run before user-management routes, protected-account checks, or Super Admin seed logic are enabled.

---

# Database Changes

## Users Table

Add:

```sql
status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE';

role VARCHAR(50) NOT NULL DEFAULT 'STANDARD_USER';

is_protected BOOLEAN NOT NULL DEFAULT FALSE;
```

---

# Protected Account Seed

System initialization must create:

```text
Email:
admin@rollfinder.local

Role:
SUPER_ADMIN

Status:
ACTIVE

is_protected:
TRUE
```

If the account already exists:

* Do not recreate
* Do not modify password

---

# Migration Requirements

## Scenario: Add User Management Fields

IF the existing users table does not contain role, status, or protected-account fields

WHEN the migration runs

THEN the migration SHALL add those fields with safe defaults.

AND existing users SHALL default to `STANDARD_USER` and `ACTIVE` unless a deterministic existing value indicates disabled status.

AND the protected Super Admin account SHALL be marked `is_protected = TRUE`.

---

## Scenario: Preserve Existing Disabled Users

IF the existing schema already has a disabled flag or equivalent account lock state

WHEN the migration backfills `status`

THEN disabled users SHALL become `DISABLED`.

AND non-disabled users SHALL become `ACTIVE`.

AND the backfill SHALL be idempotent.

---

## Scenario: Seed Protected Super Admin

IF the protected Super Admin account does not exist

WHEN system initialization runs after migration

THEN the system SHALL create the protected Super Admin with `SUPER_ADMIN`, `ACTIVE`, and `is_protected = TRUE`.

IF the protected Super Admin already exists

WHEN system initialization runs after migration

THEN the system SHALL NOT recreate the account.

AND the system SHALL NOT overwrite the existing password.

AND the system SHALL enforce `SUPER_ADMIN`, `ACTIVE`, and `is_protected = TRUE` for the protected account.

---

## Scenario: Deployment Ordering

IF user-management code depends on role, status, or protected-account fields

WHEN the release is deployed

THEN migrations SHALL run before the application starts serving the new user-management routes.

AND the deployment SHALL fail closed if required fields are missing.

---

# User Management Dashboard

Add:

```text
Admin Dashboard

Users
```

---

# User List

Display:

* Name
* Email
* Role
* Status
* Last Login
* Created Date

---

# User Actions

## Create User

Button:

```text
Create User
```

Fields:

```text
Name

Email

Role
```

Roles Available:

```text
STANDARD_USER
PLATFORM_ADMIN
```

---

## Disable User

Allowed for:

```text
STANDARD_USER
PLATFORM_ADMIN
```

Not allowed for:

```text
Protected Super Admin
```

---

## Enable User

Allowed for:

```text
STANDARD_USER
PLATFORM_ADMIN
```

---

## Promote User

Allowed:

```text
STANDARD_USER
→ PLATFORM_ADMIN
```

---

## Demote User

Allowed:

```text
PLATFORM_ADMIN
→ STANDARD_USER
```

---

## Send Password Reset

Button:

```text
Send Password Reset
```

Purpose:

Allow support staff to help users regain access when they have lost their password without exposing, generating, or emailing a plaintext password.

Allowed for:

```text
SUPER_ADMIN
PLATFORM_ADMIN
```

Target rules:

* `SUPER_ADMIN` users can send reset links to any lower user role, including `PLATFORM_ADMIN`, `ACADEMY_ADMIN`, and `STANDARD_USER`.
* `PLATFORM_ADMIN` users can send reset links only to lower users they are permitted to manage, including `ACADEMY_ADMIN` and `STANDARD_USER`.
* `PLATFORM_ADMIN` users cannot send reset links to peer `PLATFORM_ADMIN`, `SUPER_ADMIN`, legacy `ADMIN`, or protected Super Admin accounts.
* No admin can send a reset link for the protected Super Admin account.
* The action must be hidden for targets the current admin cannot reset.

Behavior:

* The system SHALL create a single-use password reset token using the existing password reset flow.
* The system SHALL queue a password reset email to the target user's registered email address.
* The system SHALL NOT return the reset token, temporary password, password hash, or any plaintext credential to the admin.
* The UI SHALL show success only after the reset email is queued.
* The UI SHALL show a clear error when the target is not eligible or email delivery cannot be queued.

---

# Protected Account Rules

The following operations must fail:

## Disable

```json
{
  "success": false,
  "message": "Protected Super Admin cannot be disabled."
}
```

---

## Delete

```json
{
  "success": false,
  "message": "Protected Super Admin cannot be deleted."
}
```

---

## Demote

```json
{
  "success": false,
  "message": "Protected Super Admin role cannot be changed."
}
```

---

## Password Reset

```json
{
  "success": false,
  "message": "Password reset is not allowed for this account."
}
```

---

# API Requirements

## List Users

```http
GET /api/admin/users
```

Authorization:

```text
SUPER_ADMIN
PLATFORM_ADMIN
```

---

## Create User

```http
POST /api/admin/users
```

Request:

```json
{
  "name": "Moderator",
  "email": "moderator@rollfinder.com",
  "role": "PLATFORM_ADMIN"
}
```

---

## Disable User

```http
POST /api/admin/users/{id}/disable
```

Authorization:

```text
SUPER_ADMIN
```

---

## Enable User

```http
POST /api/admin/users/{id}/enable
```

Authorization:

```text
SUPER_ADMIN
```

---

## Promote User

```http
POST /api/admin/users/{id}/promote
```

Authorization:

```text
SUPER_ADMIN
```

---

## Demote User

```http
POST /api/admin/users/{id}/demote
```

Authorization:

```text
SUPER_ADMIN
```

---

## Send Password Reset

```http
POST /api/admin/users/{id}/password/reset
```

Authorization:

```text
SUPER_ADMIN
PLATFORM_ADMIN
```

Response:

```json
{
  "ok": true,
  "expiresAt": "2026-06-15T12:00:00.000Z"
}
```

Requirements:

* The endpoint SHALL reuse the existing password reset token and email queue implementation.
* The endpoint SHALL enforce the same target-role restrictions as the User Actions section.
* The endpoint SHALL return HTTP 403 when the admin is not allowed to reset the target account.
* The endpoint SHALL return HTTP 404 when the target user does not exist or must not be discoverable to the requester.
* The endpoint SHALL rate-limit repeated reset sends to the same target where platform rate-limiting is available.
* The endpoint SHALL write an audit log for successful admin-triggered reset emails.

---

# Audit Logging

Every action must be logged.

Actions:

```text
USER_CREATED

USER_DISABLED

USER_ENABLED

USER_PROMOTED

USER_DEMOTED
USER_PASSWORD_RESET_EMAIL_SENT
```

---

# Security Requirements

Must prevent:

* Disabling protected Super Admin
* Deleting protected Super Admin
* Changing protected Super Admin role
* Sending password reset links for protected or peer elevated accounts
* Privilege escalation
* Self-promotion by Platform Admins

---

# Acceptance Criteria

Feature is complete when:

* Super Admin can create users
* Super Admin can disable users
* Super Admin can enable users
* Super Admin can promote users
* Super Admin can demote users
* Super Admin can send password reset links to any lower user role
* Platform Admin can send password reset links to permitted Academy Admin and Standard User accounts
* Platform Admin cannot send password reset links to peer Platform Admin, Super Admin, legacy Admin, or protected Super Admin accounts
* Protected Super Admin cannot be disabled
* Protected Super Admin cannot be deleted
* Protected Super Admin role cannot be changed
* Protected Super Admin cannot receive an admin-triggered password reset link
* Audit logs are generated
* Existing functionality remains unchanged

---

# AI Agent Instructions

Implementation Requirements:

* Use additive database migrations.
* Preserve existing APIs.
* Reuse existing authentication middleware.
* Reuse existing authorization middleware.
* Enforce protected account rules at both API and database layers.
* Add automated tests covering all protected account scenarios.

Feature Status:

MVP APPROVED
CRITICAL SECURITY FEATURE

---

# Current Implementation Status

Reviewed against source code on 2026-06-05.

Status: Mostly implemented.

Implemented:

* Protected super-admin concept exists through `isProtectedSuperAdmin`.
* User roles, status, disabled flag, email status, last login, created date, and protected flag exist in the Prisma model.
* `/admin/users` provides user listing, creation, editing, disable/enable, delete, and password email actions.
* API routes exist for list, create, detail, update, delete, disable, enable, promote, demote, and password reset.
* Protected super-admin safeguards exist in UI/action/API paths.
* Audit logs exist for major user management actions.

MVP gaps or notes:

* The PRD says protected account rules should be enforced at both API and database layers. Current source shows application/API enforcement; database-level enforcement is not visible.
* Separate visible promote/demote buttons are not shown in `/admin/users`; role changes are handled through edit controls and API routes.
* Automated tests for protected account scenarios are not visible.

MVP decision:

* Platform user management is MVP-usable.
* Database-level protected-account enforcement and expanded RBAC tests should be treated as hardening work.
