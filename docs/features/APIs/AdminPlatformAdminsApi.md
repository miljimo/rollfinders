# PRD: Admin Platform Admins API

Version: 1.0

Route: `GET|POST /api/admin/platform-admins`

Source: `src/app/api/admin/platform-admins/route.ts`

---

# Objective

Allow super admins to list and create platform admin users.

---

# IF/WHEN/THEN Requirements

## PLATFORM-ADMINS-001: Super Admin Authorization

IF a user calls this API

WHEN the user is not a super admin

THEN the API SHALL reject the request.

## PLATFORM-ADMINS-002: List Platform Admins

IF a super admin calls `GET /api/admin/platform-admins`

WHEN platform admin users exist

THEN the API SHALL return them in a `platformAdmins` array.

## PLATFORM-ADMINS-003: Create Validation

IF a super admin calls `POST /api/admin/platform-admins`

WHEN the submitted email is missing or invalid

THEN the API SHALL return HTTP 400.

## PLATFORM-ADMINS-004: Create Platform Admin

IF a super admin submits a valid platform admin request

WHEN the user is created or promoted according to existing logic

THEN the API SHALL return HTTP 201 with a `platformAdmin` object.

## PLATFORM-ADMINS-005: Audit Logging

IF a platform admin is created

WHEN the mutation succeeds

THEN the API SHALL write an admin audit log entry.

---

# Acceptance Criteria

* Only super admins can list or create platform admins.
* Invalid email returns HTTP 400.
* Successful create returns HTTP 201.
* Successful create is audit logged.
