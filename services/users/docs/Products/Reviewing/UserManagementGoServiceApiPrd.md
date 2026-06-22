# PRD: User Management Go Service API

Version: 1.0

Priority: High

Status: Ready For Review

---

# Objective

Define the Go service API for admin-managed user listing, creation, editing, deletion, status changes, and audit logging.

The API SHALL preserve identity-management behavior from the existing Next.js admin user-management routes while moving role and permission ownership to the Authorisation Service.

All mutation routes in this PRD SHALL be backed by PostgreSQL stored procedures in `services/users/migrations/procedures`, following the payment service database pattern.

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

All routes SHALL require internal service authentication and actor context.

---

# Actor Context

Next.js SHALL pass the authenticated admin actor in an internal-only header:

```text
X-Actor: {"id":"...","role":"...","email":"...","academyId":"..."}
```

IF actor context is missing or malformed

WHEN a user-management route is called

THEN the service SHALL return `403`.

IF the actor does not have the required Authorisation Service permission

WHEN a user-management route is called

THEN the service SHALL return `403`.

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
  "role": "standard_user",
  "academyId": "academy_123"
}
```

IF email is invalid

WHEN the request is handled

THEN the service SHALL return `400`.

IF a user already exists for the email

WHEN the request is handled

THEN the service SHALL return `409`.

IF an academy-scoped role is requested

WHEN no valid academy is provided or implied by the actor

THEN the service SHALL return `400`.

IF the actor is an academy admin

WHEN they create a user

THEN the service SHALL force the new user into the actor's academy.

IF the actor has the `users.role.assign` privilege and requests an existing assignable role

WHEN the request is valid

THEN the service SHALL create the user with that role.

IF the actor does not have `users.role.assign`

WHEN the actor creates a user

THEN the service SHALL use the configured default user role.

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
* role, subject to actor permissions
* status, subject to protected-account rules

Protected Super Admin accounts SHALL NOT have role or status changed through this route.

The service SHALL prevent disabling the last active Super Admin account.

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
* Super Admin accounts
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

The service SHALL reject disabling the last active Super Admin.

The service SHALL reject modifying protected Super Admin accounts.

Successful mutations SHALL write:

* `USER_DISABLED`
* `USER_ENABLED`
* `SUPER_USER_ENABLED` for enabling Super Admin users

Status mutations and audit log writes SHALL be executed through stored procedures.

---

# Requirement 7: Role Mutations

Routes:

```text
POST /v1/users/{id}/promote
POST /v1/users/{id}/demote
```

Only actors with `users.role.assign` SHALL promote or demote users.

Promote SHALL set:

```text
role = requested assignable role
```

Demote SHALL set:

```text
role = configured default user role
```

The service SHALL reject demoting:

* the actor's own account
* Super Admin accounts
* protected accounts

Promoting a user SHALL ensure a platform-admin profile exists.

Successful mutations SHALL write:

* `USER_PROMOTED`
* `USER_DEMOTED`

Role mutations, platform-admin profile creation, and audit log writes SHALL be executed through stored procedures.

---

# Requirement 8: Error Shape

The service SHALL return JSON errors with a stable message field:

```json
{
  "error": "Insufficient user management permissions."
}
```

Next.js MAY pass this message through to existing browser-facing route responses.

---

# Acceptance Criteria

* Academy admin, Platform Admin, and Super Admin scopes match existing behavior.
* Protected account checks live in the Go service.
* Password hashes are never returned.
* Audit logs are written for every successful admin mutation.
* Existing browser-facing Next.js user APIs remain compatible.
* Service-backed routes support current admin dashboard pagination, filters, and actions.
