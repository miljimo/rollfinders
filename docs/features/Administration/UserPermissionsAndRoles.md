# PRD: User Roles, Permissions and Access Control Enhancement

## Feature Branch

`feature/user_permissions_and_roles`

## Objective

Implement a robust Role-Based Access Control (RBAC) system that clearly separates platform-level administration from academy-level administration while maintaining backward compatibility with existing functionality.

The system must enforce strict data isolation between academies and prevent privilege escalation.

---

# Background

The platform currently supports multiple user types but requires clearer separation of responsibilities.

The new permission model introduces four primary user levels and allocate different dashboards base on the users privilleages.


1. Super User
2. Platform Admin
3. Academy Admin
4. Standard User

---

# User Roles

## 1. Super User( enum = SUPER_ADMIN)

### Purpose

Highest authority on the platform.

### Permissions

Can:

* View all users
* Create users
* Edit users
* not delete there self or other super users.
* Delete users
* Promote users
* Demote users
* Assign academy administrators
* Remove academy administrators
* Create academies
* Edit academies
* Delete academies
* View all academies
* View all platform settings
* Manage all platform content
* Access all admin dashboards

Can manage:

* Platform Admins
* Academy Admins
* Standard Users

Cannot be managed by:

* Platform Admins
* Academy Admins
* Standard Users

Can not do:
   Demote their self, 
   Delete their self,
   Disable their account only if there are other active super platform engineer.
---

## 2. Platform Admin(enum= PLATFORM_ADMIN)

### Purpose

Platform-level operational administrator.

### Permissions

Can:

* View all academies
* View all academy users
* Moderate academy users
* Create academy admins
* Edit academy admins
* Demote academy admins
* Delete academy admins
* View platform analytics
* Manage platform content
* Manage academy records

Can manage(users):

* Academy Admins
* Standard Users

Cannot:

* Delete Super Users
* Modify Super Users
* Promote themselves
* Delete other Platform Admins
* Modify permissions of other Platform Admins
* Create Super Users

---

## 3. Academy Admin

### Purpose

Administrator of a single academy.

### Scope

Limited to their assigned academy.

### Permissions

Can:

* View their academy
* Edit academy profile information (excluding ownership)
* View users belonging to their academy
* Manage Open Mats belonging to their academy
* Create Open Mats
* Edit Open Mats
* Delete Open Mats
* Approve academy content (if applicable)

Cannot:

* Delete academy
* Transfer academy ownership
* View other academies
* View users outside their academy
* Manage platform users
* Access platform administration
* View platform analytics
* Promote users beyond academy scope

---

## 4. Standard User

### Purpose

Regular academy member.

### Scope

Limited to their own academy.

### Permissions

Can:

* View academy information
* Create Open Mats
* Edit Open Mats they created

Cannot:

* Delete academies
* Manage users
* Access admin dashboard
* View users list
* View other academies
* Moderate content
* Delete Open Mats created by others

---

# Permission Matrix

| Action                   | Super User | Platform Admin | Academy Admin  | Standard User |
| ------------------------ | ---------- | -------------- | -------------- | ------------- |
| View All Academies       | Yes        | Yes            | No             | No            |
| View Own Academy         | Yes        | Yes            | Yes            | Yes           |
| Create Academy           | Yes        | No             | No             | No            |
| Delete Academy           | Yes        | No             | No             | No            |
| View All Users           | Yes        | Yes            | No             | No            |
| View Academy Users       | Yes        | Yes            | Yes (Own Only) | No            |
| Delete Users             | Yes        | Academy Only   | No             | No            |
| Promote Users            | Yes        | Academy Only   | No             | No            |
| Demote Users             | Yes        | Academy Only   | No             | No            |
| Create Open Mats         | Yes        | Yes            | Yes            | Yes           |
| Edit Open Mats           | Yes        | Yes            | Yes            | Creator Only  |
| Delete Open Mats         | Yes        | Yes            | Yes            | No            |
| Manage Platform Settings | Yes        | Yes            | No             | No            |

---

# Academy Isolation Rules

## Critical Requirement

Academy data must be fully isolated.

### Academy Admin

Must never see:

* Other academies
* Other academy users
* Other academy Open Mats
* Other academy statistics

### Standard User

Must never see:

* Other academies
* Other academy users
* Other academy Open Mats
* Platform administration features

---

# User Management Rules

## Super User

May:

* Promote anyone
* Demote anyone
* Delete anyone

Except:

* Cannot delete their own account if they are the last Super User

---

## Platform Admin

May:

* Promote Standard User → Academy Admin
* Demote Academy Admin → Standard User
* Delete Academy Admin
* Delete Standard User

Cannot:

* Touch Super Users
* Touch Platform Admins

---

## Academy Admin

Cannot:

* Create admin users
* Promote users
* Demote users
* Delete users

---

# Open Mat Ownership Rules

## Standard User

Can:

* Edit Open Mats they created

Cannot:

* Edit Open Mats created by others
* Delete Open Mats created by others

---

## Academy Admin

Can:

* Edit any Open Mat within their academy
* Delete any Open Mat within their academy

---

## Platform Admin

Can:

* Edit any Open Mat
* Delete any Open Mat

---

## Super User

Full control.

---

# API Authorization Requirements

Every protected endpoint must enforce:

## Authentication

Validate:

* User exists
* User active
* User authenticated

---

## Authorization

Validate:

* Role
* Academy ownership
* Resource ownership

Example:

```text
GET /api/users

Allowed:
- Super User
- Platform Admin

Denied:
- Academy Admin
- Standard User
```

Example:

```text
DELETE /api/academies/{id}

Allowed:
- Super User

Denied:
- Everyone else
```

---

# Database Changes

## Users Table

Add:

```sql
role ENUM(
  'super_user',
  'platform_admin',
  'academy_admin',
  'standard_user'
)
```

Add:

```sql
academy_id UUID NULL
```

Notes:

* Super Users may have NULL academy_id
* Platform Admins may have NULL academy_id
* Academy Admins require academy_id
* Standard Users require academy_id

---

# UI Requirements

## Super User Dashboard

Display:

* Platform statistics
* User management
* Academy management
* Role management

---

## Platform Admin Dashboard

Display:

* Academy management
* Academy users
* Moderation tools

Hide:

* Super User controls

---

## Academy Admin Dashboard

Display:

* Academy users
* Academy Open Mats
* Academy settings

Hide:

* Platform controls
* Other academies

---

## Standard User Dashboard

Display:

* My Academy
* Open Mats

Hide:

* User management
* Academy management
* Platform management

---

# Migration Requirements

## Critical

Must not break existing users.

Migration process:

1. Existing Super Admins become `super_user`
2. Existing Platform Admins become `platform_admin`
3. Existing Academy Managers become `academy_admin`
4. Existing Members become `standard_user`

---

# Security Requirements

Mandatory backend enforcement.

Never rely solely on frontend visibility.

All API endpoints must validate:

* Authentication
* Role permissions
* Academy ownership
* Resource ownership

Even if UI restrictions are bypassed.

---

# Acceptance Criteria

* Academy users cannot access data outside their academy.
* Platform Admins cannot modify Super Users.
* Platform Admins cannot modify other Platform Admins.
* Academy Admins cannot access platform-level functionality.
* Standard Users can only manage their own Open Mats.
* Existing functionality remains operational after migration.
* All API endpoints enforce RBAC checks.
* UI only displays features allowed for the current role.
* No cross-academy data leakage is possible.
* Full regression tests pass.
