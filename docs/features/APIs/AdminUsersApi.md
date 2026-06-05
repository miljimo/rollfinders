# PRD: Admin Users API

Version: 1.0

Route: `GET|POST /api/admin/users`

Source: `src/app/api/admin/users/route.ts`

---

# Objective

Support admin user listing and user creation with role-based scope, protected-account safeguards, and audit logging.

---

# IF/WHEN/THEN Requirements

## ADMIN-USERS-001: Admin Authorization

IF a user calls `GET|POST /api/admin/users`

WHEN the user lacks admin API access

THEN the API SHALL reject the request.

## ADMIN-USERS-002: List Users

IF an authorized admin calls `GET /api/admin/users`

WHEN users exist within their role scope

THEN the API SHALL return `users`, `page`, `pageSize`, `totalItems`, and `totalPages`.

## ADMIN-USERS-003: List Search And Filters

IF the list request includes search, role, status, academy, page, or page size query parameters

WHEN the API queries users

THEN the API SHALL apply those parameters according to existing role-scoped user management rules.

## ADMIN-USERS-004: Academy Admin Scope

IF an academy admin lists users

WHEN the API queries users

THEN the API SHALL return only users in the academy admin's permitted academy scope.

## ADMIN-USERS-005: Create Validation

IF an authorized admin calls `POST /api/admin/users`

WHEN the submitted email is missing or invalid

THEN the API SHALL return HTTP 400.

## ADMIN-USERS-006: Standard User Academy Requirement

IF a new standard user requires academy assignment

WHEN the `academyId` is missing or invalid

THEN the API SHALL return HTTP 400.

## ADMIN-USERS-007: Role Assignment Rules

IF a non-super-admin creates a user

WHEN the requested role exceeds their allowed management scope

THEN the API SHALL limit or reject the role assignment according to existing admin permission rules.

## ADMIN-USERS-008: Create Success

IF valid user data is submitted by an authorized admin

WHEN the user is created

THEN the API SHALL return HTTP 201 with a `user` object.

## ADMIN-USERS-009: Create Audit Log

IF a user is created

WHEN the mutation succeeds

THEN the API SHALL write an admin audit log entry.

---

# Acceptance Criteria

* Listing supports pagination and filters.
* Listing is role scoped.
* Invalid create payloads return HTTP 400.
* Successful create returns HTTP 201.
* User creation is audit logged.
