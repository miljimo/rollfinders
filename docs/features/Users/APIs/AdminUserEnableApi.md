# PRD: Admin User Enable API

Version: 1.0

Route: `POST /api/admin/users/[id]/enable`

Source: `src/app/api/admin/users/[id]/enable/route.ts`

---

# Objective

Allow authorized admins to enable permitted user accounts through the shared user mutation handler.

---

# IF/WHEN/THEN Requirements

## USER-ENABLE-001: Admin Authorization

IF a user calls `POST /api/admin/users/[id]/enable`

WHEN the user lacks admin API access

THEN the API SHALL reject the request.

## USER-ENABLE-002: Target Exists

IF an admin enables a user ID

WHEN the target user does not exist

THEN the API SHALL return HTTP 404.

## USER-ENABLE-003: Permission Scope

IF an admin attempts to enable a user outside their role or academy scope

WHEN the shared mutation handler checks permissions

THEN the API SHALL return HTTP 403.

## USER-ENABLE-004: Protected Super Admin Safeguard

IF the target is a protected super admin account

WHEN enable is requested

THEN the API SHALL reject unsafe modification according to existing protected-account rules.

## USER-ENABLE-005: Enable Success

IF an authorized admin enables a permitted user

WHEN the mutation succeeds

THEN the API SHALL set the user's status to `ACTIVE`, set `disabled = false`, return the updated `user`, and write an audit log.

---

# Acceptance Criteria

* Unauthorized users cannot enable accounts.
* Role and academy scope are enforced.
* Successful enable returns the updated user.
* Successful enable is audit logged.
