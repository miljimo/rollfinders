# PRD: Admin User Promote API

Version: 1.0

Route: `POST /api/admin/users/[id]/promote`

Source: `src/app/api/admin/users/[id]/promote/route.ts`

---

# Objective

Allow super admins to promote permitted users to platform admin.

---

# IF/WHEN/THEN Requirements

## USER-PROMOTE-001: Admin Authorization

IF a user calls `POST /api/admin/users/[id]/promote`

WHEN the user lacks admin API access

THEN the API SHALL reject the request.

## USER-PROMOTE-002: Super Admin Requirement

IF a non-super-admin attempts to promote a user

WHEN the shared mutation handler checks permissions

THEN the API SHALL return HTTP 403.

## USER-PROMOTE-003: Target Exists

IF a super admin promotes a user ID

WHEN the target user does not exist

THEN the API SHALL return HTTP 404.

## USER-PROMOTE-004: Protected Account Safeguard

IF the target is a protected super admin account

WHEN promotion is requested

THEN the API SHALL reject the mutation.

## USER-PROMOTE-005: Promote Success

IF a super admin promotes a permitted user

WHEN the mutation succeeds

THEN the API SHALL set the user's role to `PLATFORM_ADMIN`, return the updated `user`, and write an audit log.

---

# Acceptance Criteria

* Promotion requires super admin authority.
* Protected accounts are guarded.
* Successful promotion returns the updated user.
* Successful promotion is audit logged.
