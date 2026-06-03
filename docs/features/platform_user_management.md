# Feature.md

# Feature: Platform User Management & Protected Super Admin

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

Restrictions:

* Cannot disable protected Super Admin
* Cannot delete protected Super Admin
* Cannot change protected Super Admin role

---

## PLATFORM_ADMIN

Capabilities:

* Manage academies
* Manage open mats
* Moderate content
* Manage claims
* View users

Restrictions:

* Cannot create Platform Admins
* Cannot manage Super Admins
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

# Audit Logging

Every action must be logged.

Actions:

```text
USER_CREATED

USER_DISABLED

USER_ENABLED

USER_PROMOTED

USER_DEMOTED
```

---

# Security Requirements

Must prevent:

* Disabling protected Super Admin
* Deleting protected Super Admin
* Changing protected Super Admin role
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
* Protected Super Admin cannot be disabled
* Protected Super Admin cannot be deleted
* Protected Super Admin role cannot be changed
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
