# PRD: Admin User Detail API

Version: 1.0

Route: `GET|PUT|DELETE /api/admin/users/[id]`

Source: `src/app/api/admin/users/[id]/route.ts`

---

# Objective

Support admin user detail, update, and deletion while enforcing role hierarchy, academy scope, and protected-account safeguards.

---

# IF/WHEN/THEN Requirements

## ADMIN-USER-001: Admin Authorization

IF a user calls this API

WHEN the user lacks admin API access

THEN the API SHALL reject the request.

## ADMIN-USER-002: Detail Not Found

IF an authorized admin requests a user ID

WHEN no user exists for that ID

THEN the API SHALL return HTTP 404.

## ADMIN-USER-003: Detail Permission

IF an admin requests a user outside their management scope

WHEN the API checks permissions

THEN the API SHALL return HTTP 403.

## ADMIN-USER-004: Detail Success

IF an admin can view the target user

WHEN the API responds

THEN the API SHALL return JSON with a `user` object.

## ADMIN-USER-005: Platform Admin Peer Detail Redaction

IF a platform admin requests detail for a peer platform admin

WHEN the API allows read-only peer visibility

THEN the API SHALL return only redacted protected user information.

Done when:

* The response does not expose the peer platform admin's `role`.
* The response does not expose email, academy ID, email status, last login time, or audit-sensitive metadata.
* The response may include only `id`, `name`, `status`, `disabled`, `isProtected: true`, and `createdAt`.
* The response does not include edit, disable, enable, delete, promote, demote, password reset, or permission-change actions.

## ADMIN-USER-006: Super Admin Invisibility For Platform Admins

IF a platform admin requests detail for a super admin or legacy admin user

WHEN the API checks visibility

THEN the API SHALL return HTTP 404 and SHALL NOT return target user metadata.

Done when:

* `SUPER_ADMIN` users are not visible to platform admins.
* Legacy `ADMIN` users are not visible to platform admins.
* The response does not confirm the target user's role, email, status, protection flags, timestamps, or existence beyond a generic not-found response.

## ADMIN-USER-007: Update Validation

IF an admin submits an update with missing or invalid email

WHEN the API validates the payload

THEN the API SHALL return HTTP 400.

## ADMIN-USER-008: Protected Super Admin Safeguard

IF an update or delete targets a protected super admin account

WHEN the API applies mutation rules

THEN the API SHALL reject unsafe changes according to existing protected-account rules.

## ADMIN-USER-009: Last Super Admin Safeguard

IF an update would disable or demote the last active super admin-style account

WHEN the API checks active super-admin availability

THEN the API SHALL reject the mutation.

## ADMIN-USER-010: Update Success

IF an authorized admin submits a valid update

WHEN the update succeeds

THEN the API SHALL return the updated `user` object.

## ADMIN-USER-011: Delete Self Safeguard

IF an admin attempts to delete their own account

WHEN the API receives `DELETE /api/admin/users/[id]`

THEN the API SHALL return HTTP 400.

## ADMIN-USER-012: Delete Super Admin Safeguard

IF an admin attempts to delete a super admin-style account

WHEN the API receives the delete request

THEN the API SHALL return HTTP 403.

## ADMIN-USER-013: Delete Success

IF an authorized admin deletes a permitted target user

WHEN the delete succeeds

THEN the API SHALL return `{ "ok": true }`.

## ADMIN-USER-014: Audit Logging

IF a user is updated or deleted

WHEN the mutation succeeds

THEN the API SHALL write an admin audit log entry.

---

# Acceptance Criteria

* Detail, update, and delete are permission checked.
* Platform admins can receive peer platform-admin detail only as redacted protected user data.
* Platform admins receive no super admin or legacy admin detail.
* Protected super admin safeguards are enforced.
* Self-delete is blocked.
* Successful update returns the updated user.
* Successful delete returns `{ "ok": true }`.
* Mutations are audit logged.
