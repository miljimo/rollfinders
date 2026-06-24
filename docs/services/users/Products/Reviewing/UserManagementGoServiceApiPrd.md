# PRD: User Management Go Service API

Version: 1.0

Priority: High

Status: Ready For Review

---

# Objective

Define the Go service API for admin-managed user listing, creation, editing, deletion, status changes, and audit logging.

The API SHALL preserve identity-management behavior from the existing Next.js admin user-management routes while moving role and permission ownership to the Authorisation Service.

All mutation routes in this PRD SHALL be backed by PostgreSQL stored procedures in `apps/backend_api/migrations/users/procedures`, following the payment service database pattern.

Role and permission checks SHALL be performed through the Authorisation Service.

The service SHALL NOT own roles, permissions, role assignments, or direct user permissions.

---

# Route Summary

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/v1/users` | List managed users |
| `POST` | `/v1/users` | Create managed user |
| `GET` | `/v1/users/{id}` | Read managed user |
| `PUT` | `/v1/users/{id}` | Update managed user |
| `DELETE` | `/v1/users/{id}` | Delete managed user |
| `POST` | `/v1/users/{id}/disable` | Disable user |
| `POST` | `/v1/users/{id}/enable` | Enable user |
| `POST` | `/v1/users/{id}/promote` | Removed from Users Service; use Authorisation Service |
| `POST` | `/v1/users/{id}/demote` | Removed from Users Service; use Authorisation Service |
| `GET` | `/v1/users/{id}/assignable-features` | Orchestrator/Authorisation-backed assignable privilege feature search |
| `GET` | `/v1/users/{id}/assignable-features/{featureKey}/privileges` | Orchestrator/Authorisation-backed assignable privileges for one feature |
| `PUT` | `/v1/users/{id}/privileges` | Orchestrator/Authorisation-backed direct privilege assignment update |

All routes SHALL require internal service authentication and actor context.

---

# Actor Context

Next.js SHALL pass the authenticated admin actor in an internal-only header:

```text
X-Actor: {"id":"...","email":"...","organisationId":"...","applicationId":"..."}
```

IF actor context is missing or malformed

WHEN a user-management route is called

THEN the service SHALL return `403`.

IF the actor does not have the required Authorisation Service permission

WHEN a user-management route is called

THEN the service SHALL return `403`.

# Permission Requirements

Users Service does not own permissions or roles. The Authorisation Service stores and evaluates the permissions below.

| Route | Required Permission |
| --- | --- |
| `GET /v1/users` | `user.search` |
| `POST /v1/users` | `user.create` |
| `GET /v1/users/{id}` | `user.read` |
| `PUT /v1/users/{id}` | `user.update` |
| `DELETE /v1/users/{id}` | `user.delete` |
| `POST /v1/users/{id}/disable` | `user.status.disable` |
| `POST /v1/users/{id}/enable` | `user.status.enable` |
| protected-account mutations | `user.protected.manage` plus the route permission |
| `POST /v1/users/{id}/promote` | removed; use Authorisation Service role assignment APIs |
| `POST /v1/users/{id}/demote` | removed; use Authorisation Service role assignment APIs |
| `GET /v1/users/{id}/assignable-features` | `authorisation.user_permission.read` |
| `GET /v1/users/{id}/assignable-features/{featureKey}/privileges` | `authorisation.user_permission.read` |
| `PUT /v1/users/{id}/privileges` | `authorisation.user_permission.assign` and/or `authorisation.user_permission.remove` |

Permission scope SHALL include `organisation_id`, `application_id`, and `resource_type=user` with the target user id where applicable.

The product UI may use the label `privileges` for continuity with existing RollFinders language, but the target authority remains Authorisation Service permissions. Users Service SHALL NOT store or calculate assignable privileges.

---

# Requirement 1: List Users

Route:

```text
GET /v1/users
```

Supported query params:

| Param | Purpose |
| --- | --- |
| `page` | 1-based page number |
| `pageSize` | one of `20`, `50`, `100` |
| `search` | name/email partial match |
| `role` | temporary compatibility filter; ignored by Users Service after Authorisation cutover |
| `status` | active/disabled filter |
| `emailStatus` | email status filter |

The response SHALL include:

```json
{
  "users": [],
  "page": 1,
  "pageSize": 20,
  "totalItems": 0,
  "totalPages": 1
}
```

Academy-scoped visibility SHALL be decided by Authorisation Service permissions and scope.

Platform-admin and protected-account visibility SHALL be decided by Authorisation Service permissions plus Users `is_protected` status.

Users Service SHALL NOT evaluate role hierarchy locally.

---

# Requirement 2: Create User

Route:

```text
POST /v1/users
```

Request body:

```json
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "optional-password",
  "academyId": "academy_123"
}
```

IF email is invalid

WHEN the request is handled

THEN the service SHALL return `400`.

IF a user already exists for the email

WHEN the request is handled

THEN the service SHALL return `409`.

IF the actor is an academy admin

WHEN they create a user

THEN the service SHALL force the new user into the actor's academy.

Users Service SHALL create identity records only. Any role assignment for the new user must be performed by Authorisation Service after user creation.

The service SHALL write a `USER_CREATED` audit log.

The user insert and audit log write SHALL be executed through stored procedures.

---

# Requirement 3: Read User

Route:

```text
GET /v1/users/{id}
```

The service SHALL return `404` when:

* the user does not exist
* the actor is not allowed to view the user

The service SHALL NOT expose password hashes.

---

# Requirement 4: Update User

Route:

```text
PUT /v1/users/{id}
```

Editable fields:

* name
* email
* status, subject to protected-account rules

Protected accounts SHALL NOT have status changed unless the actor has `user.protected.manage` and product policy allows the mutation.

The service SHALL prevent disabling the last active protected platform recovery account.

The service SHALL write a `USER_EDITED` audit log containing previous and next state.

The account update and audit log write SHALL be executed through stored procedures.

---

# Requirement 5: Delete User

Route:

```text
DELETE /v1/users/{id}
```

The service SHALL reject deleting:

* the actor's own account
* protected accounts
* users outside the actor's management scope

The service SHALL write a `USER_DELETED` audit log when deletion succeeds.

The account delete and audit log write SHALL be executed through stored procedures.

---

# Requirement 6: Status Mutations

Routes:

```text
POST /v1/users/{id}/disable
POST /v1/users/{id}/enable
```

Disable SHALL set:

```text
status = DISABLED
disabled = true
```

Enable SHALL set:

```text
status = ACTIVE
disabled = false
```

The service SHALL reject disabling the last active protected platform recovery account.

The service SHALL reject modifying protected accounts unless the actor has `user.protected.manage` and product policy allows the mutation.

Successful mutations SHALL write:

* `USER_DISABLED`
* `USER_ENABLED`
* `PROTECTED_USER_ENABLED` for enabling protected users

Status mutations and audit log writes SHALL be executed through stored procedures.

---

# Requirement 7: Removed Role Mutations

Routes:

```text
POST /v1/users/{id}/promote
POST /v1/users/{id}/demote
```

These routes are removed from Users Service.

Role assignment, role removal, direct user permission grants, and direct user permission denies belong to Authorisation Service.

Replacement Authorisation Service routes:

```text
POST   /v1/users/{user_id}/roles
DELETE /v1/users/{user_id}/roles/{assignment_id}
POST   /v1/users/{user_id}/permissions
DELETE /v1/users/{user_id}/permissions/{assignment_id}
```

Users Service SHALL NOT mutate role or permission assignment data.

---

# Requirement 8: User Edit Form Privilege Assignment Specification

The User Edit Form SHALL include a privilege assignment section.

This section allows admins to manage fine-grained access for an existing user without hardcoded frontend access rules.

Existing fields must remain available:

* name
* email
* academy assignment, where applicable
* status, where applicable

Role assignment remains removed from Users Service. Any role or direct permission assignment must be handled by Authorisation Service through the Orchestrator/API layer.

## Requirement 8A: Assignable Privileges Only

The frontend SHALL NOT calculate which privileges the actor can grant.

The Orchestrator/API layer SHALL return only privileges the logged-in admin is allowed to assign.

Assignable privilege rule:

```text
Admin can assign a privilege only if:
- Admin already has that privilege
- The privilege is inside the actor's permitted administration scope
```

If a future delegated authority model reintroduces grant levels, that comparison must be performed server-side by Authorisation Service. The frontend must not receive or evaluate hidden privileges.

## Requirement 8B: Feature Search Control

Add an autocomplete search field to the User Edit Form privilege assignment section:

```text
Search feature...
```

Example searchable features:

```text
Academy Management
Courses
Payments
Bookings
Withdrawals
User Management
Stripe Connect
```

Feature search results SHALL come from the Orchestrator/API layer and include only features containing at least one assignable privilege for the actor.

## Requirement 8C: Privilege Checklist

When a feature is selected, the UI SHALL show all assignable privileges under that feature as checkboxes.

Example:

```text
Academy Management

[ ] academy.read
[ ] academy.create
[ ] academy.update
[ ] academy.claim.approve
[ ] academy.verification.approve
```

Rules:

* checked means the target user currently has the privilege
* unchecked means the privilege will be revoked for that feature when applied
* privileges not returned by the API must not appear in the UI
* the UI must not hardcode privilege lists
* the UI must support empty states when no assignable privileges exist

## Requirement 8D: Apply Privileges

The section SHALL include:

```text
Apply Privileges
```

When clicked, the UI SHALL send only the selected feature's changes to the Orchestrator/API layer.

The UI SHALL display:

* success message when changes are applied
* validation or authorisation error when the API rejects the change
* loading/disabled state while the request is in flight

## Requirement 8E: Orchestrator API Contract

The browser-facing route may remain a Next.js route/server action, but it must delegate to the Orchestrator/API layer. Users Service does not own this authorisation state.

### Search Assignable Features

```http
GET /v1/users/{userId}/assignable-features?search=academy
```

Response:

```json
{
  "features": [
    {
      "key": "academy-management",
      "name": "Academy Management"
    }
  ]
}
```

### Get Feature Privileges

```http
GET /v1/users/{userId}/assignable-features/{featureKey}/privileges
```

Response:

```json
{
  "feature": "academy-management",
  "privileges": [
    {
      "code": "academy.read",
      "name": "View Academy",
      "assigned": true
    },
    {
      "code": "academy.update",
      "name": "Update Academy",
      "assigned": false
    }
  ]
}
```

### Apply User Privileges

```http
PUT /v1/users/{userId}/privileges
```

Request:

```json
{
  "feature": "academy-management",
  "grant": [
    "academy.update"
  ],
  "revoke": [
    "academy.delete"
  ]
}
```

Response:

```json
{
  "status": "updated",
  "feature": "academy-management",
  "granted": [
    "academy.update"
  ],
  "revoked": [
    "academy.delete"
  ]
}
```

## Requirement 8F: Security Rules

* Frontend must not receive privileges the admin cannot assign.
* Backend must validate every privilege before applying.
* Admin cannot grant privileges they do not have.
* Admin cannot grant privileges outside their organisation/application/resource scope.
* If delegated grant levels exist in the future, admin cannot grant privileges above their level.
* All changes must be audited by Authorisation Service or the Orchestrator audit pipeline.
* Failed authorisation checks must fail closed.

## Requirement 8G: Audit Log

Privilege assignment changes SHALL record:

```text
target_user_id
changed_by_user_id
feature
granted_privileges
revoked_privileges
organisation_id
application_id
resource_type
resource_id
timestamp
request_id
```

---

# Requirement 9: Error Shape

The service SHALL return JSON errors with a stable message field:

```json
{
  "error": "Insufficient user management permissions."
}
```

Next.js MAY pass this message through to existing browser-facing route responses.

---

# Acceptance Criteria

* Academy, platform, and protected-account scopes match existing behavior through Authorisation Service permissions.
* Protected account checks live in the Go service.
* Password hashes are never returned.
* Audit logs are written for every successful admin mutation.
* Existing browser-facing Next.js user APIs remain compatible.
* Service-backed routes support current admin dashboard pagination, filters, and actions.
* User Edit Form includes a privilege assignment section.
* Feature autocomplete works and is backed by the API.
* Selecting a feature shows assignable privileges for that feature.
* Admin only sees assignable privileges returned by the backend.
* Admin can tick and untick privileges for the selected feature.
* Apply Privileges saves changes through the Orchestrator/API layer.
* Success and error messages are displayed.
* Existing user edit fields still work.
* No hardcoded privilege logic exists in the frontend.
