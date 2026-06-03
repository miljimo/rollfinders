# Feature.md

# Feature: Platform Administration & Moderation Management

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

Can:

* Manage academy profile
* Manage open mats

Cannot:

* Invite admins
* Transfer ownership

---

## STANDARD_USER

Can:

* Search academies
* View open mats
* Save favourites

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
