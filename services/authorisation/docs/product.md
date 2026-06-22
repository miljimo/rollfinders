# PRD: Authorisation Service

## Overview

Create a standalone Authorisation Service responsible for permissions, roles as permission bundles, permission assignments, policy evaluation, delegated administration, and all platform authorisation decisions.

The service becomes the single source of truth for what an authenticated user can do across RollFinders and future applications.

Users Service remains responsible for authentication and identity only. Users Service SHALL no longer own roles, permissions, role-permission mappings, user-role assignments, direct user-permission assignments, or effective permission calculation once migration is complete.

```text
Users Service answers: Who is this user?
Authorisation Service answers: What can this user do?
Organisation Service answers: Which organisation/application context is this?
Domain services answer: What resource is being acted on?
```

## Business Goal

Replace hardcoded role guards with a flexible permission-first authorisation system.

The system SHALL support:

* fine-grained access control
* service-level permissions
* application-level permissions
* organisation-scoped permissions
* resource-scoped permissions
* role-based permission bundles
* direct user permission grants and denies
* permission inheritance
* delegated administration
* permission-escalation prevention

Application code SHALL ask for permissions, not role names.

The target model does not use privileges as a separate authorisation concept. A user can access a protected resource only when they have the required permission for that resource scope. That permission may come from a role bundle or from a direct user permission assignment.

After migration, Authorisation Service SHALL be the only writable source for roles, permissions, role-permission mappings, user-role assignments, and direct user-permission assignments. Users Service SHALL NOT create, update, or calculate permission authority after cutover.

## Ownership Boundaries

### Users Service Owns

* user identity
* credentials and password management
* authentication
* sessions and refresh tokens
* MFA
* user profile basics
* authenticated actor identity emitted to callers

### Authorisation Service Owns

* permissions
* roles
* role-permission mappings
* user-role assignments
* direct user-permission assignments
* effective permission resolution
* delegation rules
* authorisation checks
* authorisation audit trail

### Organisation Service Owns

* organisations
* applications
* application-service enablement
* tenant status and settings

### Domain Services Own

Domain services own their resources and use Authorisation Service for decisions:

* Academy Service owns academy/location resources.
* Courses Service owns courses, events, open mats, and activities.
* Booking Service owns bookings and attendance.
* Payments Service owns payments, refunds, payout requests, and payee accounts.

Domain services SHALL NOT own roles, permission assignments, or global authorisation policy.

## Current Implementation Fit

Today, `services/users` contains legacy role and privilege data that must be translated into the new permission model:

* `roles`
* `privileges`
* `role_privileges`
* `user_roles`
* `user_permissions`
* `user_has_privilege`
* `effective_privileges_list`
* role and permission REST endpoints

RollFinders also has hardcoded role guards in the Next.js application, including helpers such as:

* `isSuperAdminRole`
* `isPlatformAdminRole`
* `isAcademyAdminRole`
* `academyScopedAcademyWhere`
* `academyScopedEventWhere`
* user-management helper checks tied to role names

The Authorisation Service migration SHALL move authorisation ownership out of Users Service and replace hardcoded role checks with permission-first checks. Existing Users Service `privileges` are compatibility data only and SHALL be converted into Authorisation Service `permissions`.

## Core Concepts

### Permission

A permission is a single capability identified by a stable code.

Examples:

```text
academy.create
academy.update
academy.delete
academy.claim.approve
course.create
course.update
course.delete
booking.view
booking.cancel
payment.refund
payout.request.approve
organisation.application.manage
authorisation.manage
```

Permissions are the public contract used by application and service code.

## Permission Catalog Ownership

Authorisation Service is the storage and evaluation source of truth for permissions. Domain services declare their own permission codes in their PRDs because they own the protected resources and route semantics.

Authorisation Service SHALL seed, validate, expose, and evaluate the catalog, but it SHALL NOT move domain ownership into itself.

| Prefix | Declared By | Authorisation Responsibility |
| --- | --- | --- |
| `academy.*` | Academy Service | Store/evaluate academy permissions. |
| `course.*` | Course Service | Store/evaluate course, schedule, activity, and session permissions. |
| `booking.*` | Booking Service | Store/evaluate booking, participant, and attendance permissions. |
| `payment.*` | Payment Service | Store/evaluate payment, refund, payee, settlement, report, and payout permissions. |
| `organisation.*` | Organisation Service | Store/evaluate organisation, application, service-enablement, and tenant settings permissions. |
| `user.*` | Users Service | Store/evaluate identity-management permissions. |
| `authorisation.*` | Authorisation Service | Store/evaluate permission-system administration permissions. |

Permission creation APIs must reject codes outside the approved naming convention unless a platform operator explicitly extends the catalog policy.

## Authorisation Administration Permissions

These permissions protect Authorisation Service itself.

| Permission | Purpose | Typical Scope |
| --- | --- | --- |
| `authorisation.permission.create` | Create a permission definition. | platform |
| `authorisation.permission.read` | Read a permission definition. | platform/organisation/application |
| `authorisation.permission.search` | List/search permission definitions. | platform/organisation/application |
| `authorisation.permission.update` | Update permission metadata. | platform |
| `authorisation.permission.delete` | Delete/deactivate a permission definition where policy allows. | platform |
| `authorisation.role.create` | Create a role bundle. | platform/organisation/application |
| `authorisation.role.read` | Read a role bundle. | platform/organisation/application |
| `authorisation.role.search` | List/search role bundles. | platform/organisation/application |
| `authorisation.role.update` | Update role metadata, level, or assignability. | platform/organisation/application |
| `authorisation.role.delete` | Delete/deactivate a role bundle. | platform/organisation/application |
| `authorisation.role_permission.assign` | Add a permission to a role. | platform/organisation/application |
| `authorisation.role_permission.remove` | Remove a permission from a role. | platform/organisation/application |
| `authorisation.role_permission.read` | Read role-permission mappings. | platform/organisation/application |
| `authorisation.user_role.assign` | Assign a role to a user in scope. | organisation/application/resource |
| `authorisation.user_role.remove` | Remove a role assignment from a user. | organisation/application/resource |
| `authorisation.user_role.read` | Read user role assignments. | organisation/application/resource |
| `authorisation.user_permission.assign` | Grant or deny a direct user permission. | organisation/application/resource |
| `authorisation.user_permission.remove` | Remove a direct user permission assignment. | organisation/application/resource |
| `authorisation.user_permission.read` | Read direct user permission assignments. | organisation/application/resource |
| `authorisation.effective_permission.read` | Read a user's effective permissions. | organisation/application/resource |
| `authorisation.delegation.manage` | Manage delegated administration limits. | platform/organisation/application |
| `authorisation.catalog.seed` | Seed or reconcile service-declared permission catalogs. | service/platform |
| `authorisation.audit.read` | Read authorisation audit events. | platform/organisation/application |

### Route Permission Matrix

| Route | Permission |
| --- | --- |
| `POST /v1/permissions` | `authorisation.permission.create` |
| `GET /v1/permissions` | `authorisation.permission.search` |
| `GET /v1/permissions/{permission_id}` | `authorisation.permission.read` |
| `PUT /v1/permissions/{permission_id}` | `authorisation.permission.update` |
| `POST /v1/roles` | `authorisation.role.create` |
| `GET /v1/roles` | `authorisation.role.search` |
| `GET /v1/roles/{role_id}` | `authorisation.role.read` |
| `PUT /v1/roles/{role_id}` | `authorisation.role.update` |
| `POST /v1/roles/{role_id}/permissions` | `authorisation.role_permission.assign` |
| `DELETE /v1/roles/{role_id}/permissions/{permission_id}` | `authorisation.role_permission.remove` |
| `GET /v1/roles/{role_id}/permissions` | `authorisation.role_permission.read` |
| `POST /v1/users/{user_id}/roles` | `authorisation.user_role.assign` |
| `DELETE /v1/users/{user_id}/roles/{assignment_id}` | `authorisation.user_role.remove` |
| `GET /v1/users/{user_id}/roles` | `authorisation.user_role.read` |
| `POST /v1/users/{user_id}/permissions` | `authorisation.user_permission.assign` |
| `DELETE /v1/users/{user_id}/permissions/{assignment_id}` | `authorisation.user_permission.remove` |
| `GET /v1/users/{user_id}/permissions` | `authorisation.user_permission.read` |
| `POST /v1/authorize` | service-to-service decision endpoint; protected by internal service auth |
| `GET /v1/users/{user_id}/effective-permissions` | `authorisation.effective_permission.read` |

### Role

A role is an admin-managed bundle of permissions.

Examples:

```text
Platform Owner
Platform Admin
Organisation Owner
Organisation Admin
Application Admin
Academy Owner
Academy Admin
Coach
Member
Standard User
```

Application code SHOULD NOT check role names for access. Roles exist to simplify permission assignment and delegation.

### Direct User Permission Assignment

A direct user permission assignment grants or denies one permission for one user in a scope.

Effective permissions are calculated as:

```text
role permissions
+
direct user allow permissions
-
direct user deny permissions
```

Direct user deny wins over role allow and direct user allow.

### Scope

Every role assignment and direct user permission assignment MAY be scoped.

Supported scopes:

```text
platform
organisation
application
resource
```

Resource scope supports domain resources such as:

```text
academy
course
booking
payment
payee
payout_request
```

## Delegation And Role Levels

Roles MAY have levels for delegated administration safety.

Permissions do not have levels. A permission is a capability code only. Whether a user can grant or deny a permission is controlled by Authorisation Service administration permissions and scope, not by a numeric permission level.

Example levels:

```text
1000 Platform Owner
900  Platform Admin
800  Organisation Owner
700  Organisation Admin
600  Application Admin
500  Academy Owner
400  Academy Admin
300  Coach
200  Member
100  User
```

Levels do not replace permission checks. Role levels limit which roles a user can assign.

Critical rules:

```text
assigned_role.level <= actor.maximum_assignable_level
```

A user cannot grant a role above their own delegated authority.

## Database Model

Authorisation Service SHALL manage its own PostgreSQL schema named `authorisation`.

All Authorisation tables, functions, procedures, indexes, and audit records SHALL live under the `authorisation` schema. The service runtime SHALL set its database `search_path` to `authorisation, public`. Other services must not create or mutate Authorisation-owned schema objects directly.

Runtime service code SHALL NOT embed operational SQL.

All data operations SHALL be exposed through database functions or stored procedures defined in migrations. Go code may call those functions/procedures by name, but table reads, inserts, updates, deletes, joins, authorisation decisions, and migration writes must live in database functions/procedures.

Allowed in Go service code:

```text
db.Function(ctx, "authorisation.permissions_list")
db.Procedure(ctx, "authorisation.permission_insert")
```

Not allowed in Go service code:

```text
SELECT ... FROM permissions
INSERT INTO user_roles ...
UPDATE roles ...
DELETE FROM role_permissions ...
```

### permissions

```sql
CREATE TABLE permissions (
    id text PRIMARY KEY,
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
```

### roles

```sql
CREATE TABLE roles (
    id text PRIMARY KEY,
    key text NOT NULL UNIQUE,
    name text NOT NULL,
    level integer NOT NULL DEFAULT 100,
    description text,
    assignable boolean NOT NULL DEFAULT true,
    system_role boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
```

### role_permissions

```sql
CREATE TABLE role_permissions (
    role_id text NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id text NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (role_id, permission_id)
);
```

### user_roles

```sql
CREATE TABLE user_roles (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    role_id text NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    organisation_id text,
    application_id text,
    resource_type text,
    resource_id text,
    assigned_by text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
```

### user_permissions

```sql
CREATE TABLE user_permissions (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    permission_id text NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    effect text NOT NULL,
    organisation_id text,
    application_id text,
    resource_type text,
    resource_id text,
    assigned_by text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
```

`effect` SHALL support:

```text
ALLOW
DENY
```

## API Endpoints

### Permissions

```http
POST   /v1/permissions
GET    /v1/permissions
GET    /v1/permissions/{permission_id}
PUT    /v1/permissions/{permission_id}
```

### Roles

```http
POST   /v1/roles
GET    /v1/roles
GET    /v1/roles/{role_id}
PUT    /v1/roles/{role_id}
```

### Role Permissions

```http
POST   /v1/roles/{role_id}/permissions
DELETE /v1/roles/{role_id}/permissions/{permission_id}
GET    /v1/roles/{role_id}/permissions
```

### User Roles

```http
POST   /v1/users/{user_id}/roles
DELETE /v1/users/{user_id}/roles/{assignment_id}
GET    /v1/users/{user_id}/roles
```

### User Permission Assignments

```http
POST   /v1/users/{user_id}/permissions
DELETE /v1/users/{user_id}/permissions/{assignment_id}
GET    /v1/users/{user_id}/permissions
```

### Authorisation Checks

```http
POST /v1/authorize
```

Request:

```json
{
  "subjectId": "user_123",
  "permission": "academy.update",
  "organisationId": "org_123",
  "applicationId": "app_rollfinders",
  "resourceType": "academy",
  "resourceId": "academy_456"
}
```

Response:

```json
{
  "authorized": true,
  "decision": "allow"
}
```

Denied response:

```json
{
  "authorized": false,
  "decision": "deny",
  "reason": "missing_permission"
}
```

### Effective Permissions

```http
GET /v1/users/{user_id}/effective-permissions
```

Query parameters MAY include:

```text
organisation_id
application_id
resource_type
resource_id
```

## Service Integration

Every service SHALL migrate away from hardcoded role checks.

Target flow:

```text
Client or service request
  -> Users Service authenticates identity
  -> Authorisation Service checks permission
  -> Domain service performs domain mutation
```

RollFinders SHALL introduce a shared authorisation client/helper before migrating individual routes. New application code SHALL call a permission-based helper such as:

```text
authorize(actor, "academy.update", scope)
```

New application code SHALL NOT add checks such as:

```text
role === "PLATFORM_ADMIN"
role === "ACADEMY_ADMIN"
role === "SUPER_ADMIN"
```

Legacy role fields may remain temporarily for compatibility but SHALL NOT be the main authorisation interface for new work.

## Migration Plan

### Phase 1: Permission Catalog And Contract

Define the Authorisation Service API, permission naming rules, scope model, and initial RollFinders permission catalog.

### Phase 2: Translate Existing Users Authorisation Data

Translate existing Users Service roles, privileges, role privileges, user roles, and user permissions into the Authorisation Service permission model.

Legacy Users Service `privileges` SHALL become Authorisation Service `permissions`. They SHALL NOT remain a separate concept in the target model.

No application behaviour should change in this phase.

### Phase 3: Cut Over Permission Source Of Truth

Cut over role, permission, role-permission, user-role, and user-permission writes to Authorisation Service.

After this phase:

* Authorisation Service is the only writable source for permission data.
* Users Service permission tables are read-only, deprecated, or disabled for writes.
* Users Service remains responsible only for authentication and identity.
* Rollback is allowed only as an operational recovery step before downstream callers fully migrate.

### Phase 4: RollFinders Authorisation Helper

Add a shared RollFinders authorisation helper that accepts permission and scope.

The helper SHALL treat Authorisation Service as the primary permission source after cutover. Any Users Service compatibility fallback MUST be temporary, feature-flagged, and removed before migration is complete.

### Phase 5: Replace Hardcoded Guards

Replace hardcoded role checks in RollFinders route handlers, server actions, and dashboard access logic with permission-first authorisation checks.

Priority areas:

* academy management
* academy claims
* course management
* booking management
* payment refund and payout actions
* user administration
* organisation/application administration

### Phase 6: Domain Service Enforcement

Academy, Courses, Booking, Payments, and Organisation services SHALL call Authorisation Service for sensitive reads and mutations.

### Phase 7: Remove Authorisation Ownership From Users Service

After all callers use Authorisation Service:

* remove role/permission management APIs from Users Service
* stop using Users Service `effective_privileges_list`
* stop using Users Service `user_has_privilege`
* remove or disable any Users Service write path to role, permission, role-permission, user-role, and user-permission data
* keep only authentication and identity APIs in Users Service

### Phase 8: Remove Legacy Role Guards

Remove obsolete hardcoded role helpers and compatibility branches from RollFinders once permission-first checks fully cover the behaviour.

## Audit Trail

Every authorisation change SHALL be audited.

Audit events SHALL record:

* actor user id
* target user id, when applicable
* role id, when applicable
* permission id, when applicable
* scope
* previous value
* new value
* timestamp
* request id, when available

## Acceptance Criteria

* Authorisation Service owns roles, permissions, role-permission mappings, user-role assignments, direct user-permission assignments, and effective permission resolution.
* Users Service no longer owns authorisation after migration.
* Authorisation Service is the only writable permission source after cutover.
* Users Service remains responsible for authentication and identity.
* Permission checks are exposed through `POST /v1/authorize`.
* Authorisation decisions support organisation, application, and resource scopes.
* Users can have multiple roles.
* Users can have direct permission allow and deny assignments.
* Direct user deny wins over allow.
* Users cannot assign roles above their delegated level.
* Permissions do not have numeric levels.
* Full audit history is maintained for authorisation changes.
* RollFinders new code uses permission-first checks rather than role-name guards.
* Existing hardcoded role guards are migrated through the rollout plan.
* Academy, Courses, Booking, Payments, and Organisation services use Authorisation Service for sensitive access control in the target state.
* The service supports multi-organisation and multi-application architecture.
