# PRD: Admin User Disable API

Version: 1.0

Route: `POST /api/admin/users/[id]/disable`

Source: `src/app/api/admin/users/[id]/disable/route.ts`

---

# Objective

Allow authorized admins to disable permitted user accounts through the shared user mutation handler.

---

# IF/WHEN/THEN Requirements

## USER-DISABLE-001: Admin Authorization

IF a user calls `POST /api/admin/users/[id]/disable`

WHEN the user lacks admin API access

THEN the API SHALL reject the request.

## USER-DISABLE-002: Target Exists

IF an admin disables a user ID

WHEN the target user does not exist

THEN the API SHALL return HTTP 404.

## USER-DISABLE-003: Permission Scope

IF an admin attempts to disable a user outside their role or academy scope

WHEN the shared mutation handler checks permissions

THEN the API SHALL return HTTP 403.

## USER-DISABLE-004: Protected Super Admin Safeguard

IF the target is a protected super admin account

WHEN disable is requested

THEN the API SHALL reject the mutation.

## USER-DISABLE-005: Last Active Super Admin Safeguard

IF disabling the target would remove the last active super admin-style account

WHEN the API checks active super-admin availability

THEN the API SHALL reject the mutation.

## USER-DISABLE-006: Disable Success

IF an authorized admin disables a permitted user

WHEN the mutation succeeds

THEN the API SHALL set the user's status to `DISABLED`, set `disabled = true`, return the updated `user`, and write an audit log.

---

# Acceptance Criteria

* Unauthorized users cannot disable accounts.
* Protected accounts are guarded.
* Successful disable returns the updated user.
* Successful disable is audit logged.
