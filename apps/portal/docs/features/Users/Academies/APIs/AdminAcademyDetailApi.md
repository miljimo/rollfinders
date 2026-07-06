# PRD: Admin Academy Detail API

Version: 1.0

Route: `GET|PUT|DELETE|POST /api/admin/academies/[id]`

Source: `src/app/api/admin/academies/[id]/route.ts`

---

# Objective

Support admin academy detail, update, delete, and form-post update behavior with role-based access control.

---

# IF/WHEN/THEN Requirements

## ADMIN-ACADEMY-001: Admin Authorization

IF a user calls this API

WHEN the user lacks admin API access

THEN the API SHALL reject the request.

## ADMIN-ACADEMY-002: Detail Access Scope

IF an admin calls `GET /api/admin/academies/[id]`

WHEN the admin cannot access the requested academy

THEN the API SHALL return HTTP 403.

## ADMIN-ACADEMY-003: Detail Not Found

IF an admin can access the requested academy

WHEN no academy record exists

THEN the API SHALL return HTTP 404.

## ADMIN-ACADEMY-004: Detail Success

IF an admin can access an existing academy

WHEN the API responds

THEN the API SHALL return the academy JSON object.

## ADMIN-ACADEMY-005: Academy Admin Update Policy

IF an academy admin attempts to update their assigned academy through `PUT` or non-delete `POST`

WHEN the request reaches the API

THEN the API SHALL follow the canonical assigned-academy profile update policy in `apps/portal/docs/features/Users/Academies/Products/AcademyAdminWithDashboardRoles.md`.

AND the API SHALL preserve protected platform-controlled fields unless the canonical policy explicitly allows changing them.

AND cross-academy update attempts SHALL return HTTP 403.

## ADMIN-ACADEMY-006: Update Validation

IF an authorized admin submits invalid academy data

WHEN the API validates the payload

THEN the API SHALL return HTTP 400.

## ADMIN-ACADEMY-007: Update Duplicate Handling

IF an authorized admin updates an academy to duplicate another academy's name, address, and postcode

WHEN uniqueness is checked

THEN the API SHALL return HTTP 409.

## ADMIN-ACADEMY-008: Delete Requires Super Admin

IF a user calls `DELETE /api/admin/academies/[id]` or submits `_method=delete`

WHEN the user is not a super admin

THEN the API SHALL reject the delete request.

## ADMIN-ACADEMY-009: Delete Success

IF a super admin deletes an academy

WHEN the delete succeeds

THEN the API SHALL return `{ "ok": true }` for `DELETE` or redirect for form-post delete.

## ADMIN-ACADEMY-010: Audit Logging

IF an academy is updated or deleted

WHEN the mutation succeeds

THEN the API SHALL write an admin audit log entry.

## ADMIN-ACADEMY-011: Form-Post Update Redirect

IF an authorized admin submits a non-delete `POST /api/admin/academies/[id]`

WHEN the academy update succeeds

THEN the API SHALL redirect to `/admin/academies` using HTTP 303.

---

# Acceptance Criteria

* Read access is academy-scoped.
* Update access follows the canonical Academy Admin assigned-academy profile policy.
* Delete access requires super admin.
* Invalid and duplicate updates return clear errors.
* Successful mutations are audit logged.
* Successful form-post updates return users to academy management.
