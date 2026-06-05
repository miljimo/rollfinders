# PRD: Admin Platform Admins API

Version: 1.0

Route: `GET|POST /api/admin/platform-admins`

Source: `src/app/api/admin/platform-admins/route.ts`

---

# Objective

Allow super admins to list and create platform admin users.

Platform admins must not be able to list, view, inspect, or receive information about other platform admins, super admins, or legacy admin users through this API.

If peer platform-admin read-only visibility is supported, that visibility belongs to `/api/admin/users` as redacted protected user records. It SHALL NOT be implemented through `/api/admin/platform-admins`.

---

# IF/WHEN/THEN Requirements

## PLATFORM-ADMINS-001: Super Admin Authorization

IF a user calls this API

WHEN the user is not a super admin

THEN the API SHALL reject the request.

Done when:

* `PLATFORM_ADMIN` users receive an authorization error.
* `ACADEMY_ADMIN`, standard users, and unauthenticated users receive an authorization error.
* The response does not include platform admin, super admin, or legacy admin user data.
* The response does not confirm whether any platform admin, super admin, or legacy admin user exists.

---

## PLATFORM-ADMINS-002: List Platform Admins

IF a super admin calls `GET /api/admin/platform-admins`

WHEN platform admin users exist

THEN the API SHALL return them in a `platformAdmins` array.

Done when:

* Only super admins can receive the `platformAdmins` array.
* Returned platform admin records include only fields needed for super-admin management.
* Super admin and legacy admin users are not returned by this endpoint.

---

## PLATFORM-ADMINS-003: Create Validation

IF a super admin calls `POST /api/admin/platform-admins`

WHEN the submitted email is missing or invalid

THEN the API SHALL return HTTP 400.

---

## PLATFORM-ADMINS-004: Create Platform Admin

IF a super admin submits a valid platform admin request

WHEN the user is created or promoted according to existing logic

THEN the API SHALL return HTTP 201 with a `platformAdmin` object.

---

## PLATFORM-ADMINS-005: Audit Logging

IF a platform admin is created

WHEN the mutation succeeds

THEN the API SHALL write an admin audit log entry.

---

## PLATFORM-ADMINS-006: Peer Admin Information Protection

IF a `PLATFORM_ADMIN` user calls `GET` or `POST /api/admin/platform-admins`

WHEN the API rejects the request

THEN the API SHALL NOT return any peer platform admin, super admin, or legacy admin information.

Done when:

* No user names, emails, roles, statuses, timestamps, protection flags, login times, or IDs are returned.
* The error response is generic and authorization-based.
* The endpoint cannot be used by a platform admin to discover whether another elevated admin account exists.

---

# Acceptance Criteria

* Only super admins can list or create platform admins.
* Platform admins cannot list, view, inspect, create, or receive information about other platform admins.
* Platform admins cannot receive super admin or legacy admin information from this API.
* Unauthorized responses do not confirm whether elevated admin accounts exist.
* Invalid email returns HTTP 400.
* Successful create returns HTTP 201.
* Successful create is audit logged.
