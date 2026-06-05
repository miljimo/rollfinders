# PRD: Admin User Demote API

Version: 1.0

Route: `POST /api/admin/users/[id]/demote`

Source: `src/app/api/admin/users/[id]/demote/route.ts`

---

# Objective

Allow super admins to demote permitted users to standard user while protecting super admin-style accounts.

---

# IF/WHEN/THEN Requirements

## USER-DEMOTE-001: Admin Authorization

IF a user calls `POST /api/admin/users/[id]/demote`

WHEN the user lacks admin API access

THEN the API SHALL reject the request.

## USER-DEMOTE-002: Super Admin Requirement

IF a non-super-admin attempts to demote a user

WHEN the shared mutation handler checks permissions

THEN the API SHALL return HTTP 403.

## USER-DEMOTE-003: Target Exists

IF a super admin demotes a user ID

WHEN the target user does not exist

THEN the API SHALL return HTTP 404.

## USER-DEMOTE-004: Self Demotion Safeguard

IF a super admin attempts to demote their own account

WHEN the API checks the actor and target

THEN the API SHALL return HTTP 403.

## USER-DEMOTE-005: Super Admin Account Safeguard

IF the target is a super admin-style account

WHEN demotion is requested

THEN the API SHALL return HTTP 403.

## USER-DEMOTE-006: Demote Success

IF a super admin demotes a permitted user

WHEN the mutation succeeds

THEN the API SHALL set the user's role to `STANDARD_USER`, return the updated `user`, and write an audit log.

---

# Acceptance Criteria

* Demotion requires super admin authority.
* Self-demotion is blocked.
* Super admin-style accounts cannot be demoted through this API.
* Successful demotion is audit logged.
