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

## ADMIN-USERS-005: Platform Admin User Visibility

IF a platform admin lists users

WHEN the API queries users

THEN the API SHALL return manageable operational users and MAY include peer platform admins only as redacted protected records.

Done when:

* Platform admins can see `ACADEMY_ADMIN`, `STANDARD_USER`, and legacy `USER` records according to platform-admin user management permissions.
* Peer `PLATFORM_ADMIN` records, if returned, are read-only protected records.
* Peer platform-admin records do not expose `role`, `email`, `academyId`, `emailStatus`, `lastLoginAt`, or audit-sensitive metadata.
* Peer platform-admin records may expose only `id`, `name`, `status`, `disabled`, `isProtected: true`, and `createdAt`.
* Peer platform-admin records must not expose actions for edit, disable, enable, delete, promote, demote, password reset, or permission changes.

## ADMIN-USERS-006: Super Admin Invisibility For Platform Admins

IF a platform admin lists users

WHEN super admin or legacy admin users exist

THEN the API SHALL NOT return those users in rows, search results, role filter results, pagination counts, or total counts.

Done when:

* `SUPER_ADMIN` users are invisible to platform admins.
* Legacy `ADMIN` users are invisible to platform admins.
* Searching by a super admin or legacy admin name or email does not reveal a record.
* Filtering by `SUPER_ADMIN` or legacy `ADMIN` does not reveal a record.
* Pagination metadata does not count hidden super-admin-style records.

## ADMIN-USERS-007: Create Validation

IF an authorized admin calls `POST /api/admin/users`

WHEN the submitted email is missing or invalid

THEN the API SHALL return HTTP 400.

## ADMIN-USERS-008: Standard User Academy Requirement

IF a new standard user requires academy assignment

WHEN the `academyId` is missing or invalid

THEN the API SHALL return HTTP 400.

## ADMIN-USERS-009: Role Assignment Rules

IF a non-super-admin creates a user

WHEN the requested role exceeds their allowed management scope

THEN the API SHALL limit or reject the role assignment according to existing admin permission rules.

## ADMIN-USERS-010: Create Success

IF valid user data is submitted by an authorized admin

WHEN the user is created

THEN the API SHALL return HTTP 201 with a `user` object.

## ADMIN-USERS-011: Create Audit Log

IF a user is created

WHEN the mutation succeeds

THEN the API SHALL write an admin audit log entry.

---

# Acceptance Criteria

* Listing supports pagination and filters.
* Listing is role scoped.
* Platform admins may see peer platform admins only as redacted protected records.
* Platform admins never see super admin or legacy admin records.
* Invalid create payloads return HTTP 400.
* Successful create returns HTTP 201.
* User creation is audit logged.
