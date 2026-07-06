# Platform Administration & Moderation Management

## Feature ID

RF-011

## Priority

Critical

## Type

Platform Administration

---

# Objective

Implement a platform-wide administration system that allows Super Admins to create, manage, and remove Platform Administrators.

This feature enables the RollFinder platform to scale operationally by allowing trusted staff members to moderate academies, approve claims, manage content, and support users without granting full platform ownership.

The implementation must not affect existing academy ownership, academy administration, open mat management, search, discovery, or user functionality.

---

# Business Problem

As RollFinder grows, a single person cannot manage:

* Academy claims
* User support
* Open mat moderation
* Academy disputes
* Content verification
* Platform operations

The platform requires a secure hierarchy that separates platform ownership from day-to-day moderation.

---

# Role Hierarchy

```text
SUPER_ADMIN
│
├── PLATFORM_ADMIN
│
├── ACADEMY_OWNER
│     └── ACADEMY_ADMIN
│
└── STANDARD_USER
```

---

# Role Definitions

## SUPER_ADMIN

Platform owner.

Can:

* Create Platform Admins
* Remove Platform Admins
* View all users
* Manage all academies
* Transfer academy ownership
* Manage platform settings
* Manage moderation policies
* Access analytics
* Access audit logs
* Manage feature flags
* Manage billing
* Manage subscriptions

Cannot:

* Be removed by Platform Admin

---

## PLATFORM_ADMIN

Moderation and operations role.

Can:

* View all academies
* Approve academy claims
* Reject academy claims
* View users
* Moderate open mats
* Edit incorrect academy information
* Disable academy listings
* Suspend users
* Resolve disputes
* View analytics

Cannot:

* Create Platform Admins
* Delete Super Admins
* Change platform settings
* Manage billing
* Access feature flags

---

## ACADEMY_OWNER

Can:

* Manage academy
* Invite academy admins
* Manage open mats
* Transfer academy ownership

---

## ACADEMY_ADMIN

Academy Admin dashboard, same-academy user management, academy profile management, and academy-scoped open mat permissions are defined in:

`apps/portal/docs/features/Users/Academies/Products/AcademyAdminWithDashboardRoles.md`

This platform moderation PRD SHALL NOT duplicate or override those Academy Admin requirements.

---

## STANDARD_USER

Can:

* Search academies
* View open mats
* Save favourites

---

# Schema Impact

Schema changes are required for this PRD.

IF this PRD is implemented

WHEN the deployment is prepared

THEN database migration scripts SHALL be included in the same release as the Platform Admin application code.

AND the migration SHALL run before any code path reads or writes `PLATFORM_ADMIN` roles or admin audit logs.

AND the deployment SHALL verify that the migration completed before enabling Platform Admin routes.

---

# Database Changes

## Update Users Table

Add role column.

```sql
ALTER TABLE users
ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'STANDARD_USER';
```

---

# Platform Roles

Valid values:

```text
SUPER_ADMIN
PLATFORM_ADMIN
STANDARD_USER
```

Academy roles remain stored separately in:

academy_members

```text
OWNER
ADMIN
```

---

# New Table: admin_audit_logs

```sql
CREATE TABLE admin_audit_logs (
    id UUID PRIMARY KEY,
    actor_user_id UUID NOT NULL,
    target_user_id UUID NULL,
    action VARCHAR(255) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL
);
```

---

# Migration Requirements

## Scenario: Add Platform Admin Role Support

IF the existing users table does not support Platform Admin roles

WHEN the migration runs

THEN the migration SHALL add the role field or enum value needed for `PLATFORM_ADMIN`.

AND the migration SHALL preserve existing user accounts by assigning the safe default role `STANDARD_USER` where no role exists.

AND the migration SHALL NOT promote any existing user to `PLATFORM_ADMIN` unless an explicit seed or Super Admin action does so.

---

## Scenario: Add Admin Audit Logs

IF admin actions need audit logging

WHEN the migration runs

THEN the migration SHALL create the admin audit log table before audit-writing code is deployed.

AND the audit log schema SHALL support actor user id, optional target user id, action, metadata, and created timestamp.

AND the migration SHALL add indexes needed for actor, target, action, and recent activity queries.

---

## Scenario: Deployment Ordering

IF the deployment contains both schema and application changes

WHEN the release is executed

THEN migrations SHALL run first.

AND application code SHALL only be deployed or enabled after the migration succeeds.

AND rollback planning SHALL account for newly written roles and audit rows.

---

# User Stories

## Story 1

As a Super Admin

I want to create Platform Admins

So trusted staff can help run the platform.

---

## Story 2

As a Super Admin

I want to remove Platform Admins

So I can revoke access when necessary.

---

## Story 3

As a Platform Admin

I want to approve academy claims

So academy information remains accurate.

---

## Story 4

As a Platform Admin

I want to moderate open mats

So users only see legitimate content.

---

# API Requirements

## List Platform Admins

```http
GET /api/admin/platform-admins
```

Authorization:

```text
SUPER_ADMIN
```

---

## Create Platform Admin

```http
POST /api/admin/platform-admins
```

Request:

```json
{
  "email": "moderator@rollfinder.com"
}
```

Behavior:

* Existing user → promote to PLATFORM_ADMIN
* New user → create invitation

Response:

```json
{
  "success": true
}
```

---

## Remove Platform Admin

```http
DELETE /api/admin/platform-admins/{userId}
```

Authorization:

```text
SUPER_ADMIN
```

Response:

```json
{
  "success": true
}
```

---

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

## Suspend User

```http
POST /api/admin/users/{id}/suspend
```

Authorization:

```text
PLATFORM_ADMIN
SUPER_ADMIN
```

---

## Reactivate User

```http
POST /api/admin/users/{id}/activate
```

Authorization:

```text
PLATFORM_ADMIN
SUPER_ADMIN
```

---

# Admin Dashboard

Add new dashboard.

```text
Admin Dashboard
│
├── Overview
├── Users
├── Academies
├── Academy Claims
├── Open Mats
├── Moderation Queue
├── Platform Admins
├── Analytics
└── Audit Logs
```

Side Panel parity:

IF a Super Admin can see a dashboard Quick Action

WHEN the Admin Dashboard side panel renders

THEN the side panel SHALL include a corresponding direct navigation item.

AND the Super Admin side panel SHALL include:

* Dashboard
* Manage Academies
* Manage Open Mats
* Manage Users
* Analytics
* Academy Review
* Academy Claims
* Map
* Settings

AND Settings SHALL be the final primary side-panel item before Help & Support and Logout.

---

# Platform Admin Management Screen

Display:

* Name
* Email
* Role
* Date Added
* Last Login

Actions:

* Add Admin
* Remove Admin
* View Activity

---

# Moderation Queue

Purpose:

Central location for platform moderation.

Display:

* Pending academy claims
* Reported academies
* Reported open mats
* Ownership disputes

Actions:

* Approve
* Reject
* Escalate

---

# Audit Logging

Log all administrative actions.

Examples:

```json
{
  "actor": "super_admin",
  "target": "user_123",
  "action": "PROMOTE_TO_PLATFORM_ADMIN",
  "timestamp": "2026-06-03T10:00:00Z"
}
```

```json
{
  "actor": "platform_admin",
  "target": "academy_456",
  "action": "APPROVE_CLAIM",
  "timestamp": "2026-06-03T10:05:00Z"
}
```

---

# Security Requirements

Must:

* Enforce role-based access control
* Prevent privilege escalation
* Prevent Platform Admins from creating Platform Admins
* Prevent deletion of the final Super Admin
* Log all admin actions
* Require authentication on all admin endpoints

---

# Acceptance Criteria

Feature is complete when:

* Super Admin can create Platform Admins
* Super Admin can remove Platform Admins
* Platform Admin can moderate academies
* Platform Admin can moderate open mats
* Platform Admin can view users
* Audit logging is implemented
* Role-based permissions are enforced
* Existing academy functionality remains unchanged
* Existing RF-010 functionality remains unchanged
* Existing APIs remain backward compatible

---

# AI Agent Implementation Instructions

Before implementation:

1. Analyze existing authentication system.
2. Analyze current user role model.
3. Reuse existing authorization middleware.
4. Reuse existing dashboard layout.
5. Reuse existing API conventions.

Implementation Rules:

* Do not modify RF-010 behavior.
* Do not modify academy ownership behavior.
* Use additive migrations only.
* Preserve backwards compatibility.
* Follow existing architecture patterns.

Feature Status:

READY FOR IMPLEMENTATION

---

# Current Implementation Status

Reviewed against source code on 2026-06-05.

Status: Partial.

Implemented:

* Admin role helpers exist for super admin, platform admin, academy admin, and standard user roles.
* Platform admin user APIs exist for platform-admin creation/removal.
* Admin audit log model and write helper exist.
* Admin dashboard, user management, academy management, open mat management, and settings pages exist.
* User and academy actions write audit logs for many management operations.

Missing or partial:

* Dedicated moderation queue is not visible in source.
* Dedicated academy claim approval/rejection workflow is not visible in source.
* Platform analytics access is blocked by missing analytics implementation.
* Audit logs exist, but not every platform moderation, team, or verification action has detailed audit metadata.

MVP decision:

* Core platform administration is MVP-usable.
* Moderation queue, claim approval, and analytics should be implemented as separate MVP gap tasks only if they are required for launch.
