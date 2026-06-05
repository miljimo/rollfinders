# PRD: Admin Academies API

Version: 1.0

Route: `GET|POST /api/admin/academies`

Source: `src/app/api/admin/academies/route.ts`

---

# Objective

Support admin academy listing and super-admin academy creation while preserving role-scoped visibility.

---

# IF/WHEN/THEN Requirements

## ADMIN-ACADEMIES-001: Admin Authorization

IF a user calls `GET /api/admin/academies`

WHEN the user lacks admin API access

THEN the API SHALL reject the request.

## ADMIN-ACADEMIES-002: List Academies

IF an authorized admin calls `GET /api/admin/academies`

WHEN academy records exist

THEN the API SHALL return academies with pagination metadata.

## ADMIN-ACADEMIES-003: List Filters

IF the request includes search or verification query parameters

WHEN the API queries academies

THEN the API SHALL apply the existing search, filter, pagination, and role-scope rules.

## ADMIN-ACADEMIES-004: Create Requires Super Admin

IF a user calls `POST /api/admin/academies`

WHEN the user is not a super admin

THEN the API SHALL reject the create request.

## ADMIN-ACADEMIES-005: Create Validation

IF a super admin submits invalid academy data

WHEN the API validates the payload

THEN the API SHALL return HTTP 400 with an invalid academy error.

## ADMIN-ACADEMIES-006: Duplicate Academy

IF a super admin submits an academy with an existing name, address, and postcode combination

WHEN the API checks uniqueness

THEN the API SHALL return HTTP 409.

## ADMIN-ACADEMIES-007: Create Success

IF a super admin submits valid unique academy data

WHEN the academy is created

THEN the API SHALL redirect to `/admin/academies` using HTTP 303.

---

# Acceptance Criteria

* Academy lists are role scoped.
* Create is super-admin only.
* Invalid data returns HTTP 400.
* Duplicates return HTTP 409.
* Successful form-style creation redirects to the admin academy list.
