# PRD: Academy Administrator IF/WHEN/THEN Requirements

## Feature Branch

`feature/academic_admin_permissions_and_roles`

## Role

`ACADEMY_ADMIN`

## Objective

Implement Academy Administrator access control using strict IF/WHEN/THEN requirements so AI agents can implement the role without misunderstanding permission boundaries.

The Academy Administrator SHALL only have visibility and management capabilities within their assigned academy.

Academy Administrators SHALL use the same shared Admin Board as Platform Admins and Super Admins, with visible data and available actions customized by policy and privileges.

---

# Shared Admin Board Access

## Scenario: Access Shared Admin Board

IF the authenticated user has the role `ACADEMY_ADMIN`

WHEN the user logs in successfully

THEN the system SHALL redirect the user to the shared Admin Board at `/admin`.

AND RollFinders SHALL have one single Admin Board for `SUPER_ADMIN`, legacy `ADMIN`, `PLATFORM_ADMIN`, and `ACADEMY_ADMIN` users.

AND the Admin Board SHALL use the same admin shell, layout, and board route for all admin roles.

AND the Admin Board SHALL customize visible panels, records, and actions by the authenticated user's policy and privileges.

AND the dashboard SHALL display:
* User full name
* User profile avatar (if available)
* Registration date
* Academy name if any or removed the field.

AND the dashboard SHALL display academy-level administration features for the administrator's assigned academy only.

AND the dashboard SHALL display user management features for the administrator's assigned academy only.

AND the dashboard SHALL display roll Mats management features for the administrator's assigned academy only.

AND the dashboard SHALL NOT display platform-wide administration features.

AND the dashboard SHALL NOT display Super Admin, legacy Admin, or Platform Admin controls.

AND the dashboard SHALL NOT display data belonging to any other academy.

AND an `ACADEMY_ADMIN` without an assigned `academy_id` SHALL NOT be granted Admin Board access.

---

# User Visibility

## Scenario: View Users Within Assigned Academy

IF the authenticated user has the role `ACADEMY_ADMIN`

WHEN the user opens the user management page

THEN the system SHALL display users belonging to the administrator's assigned academy only.

AND the system SHALL include Academy Administrators and Standard Users from the same academy only.

AND the system SHALL include legacy `ACADEMY_OWNER` and legacy `USER` records from the same academy only when those roles exist.

AND the system SHALL NOT display users from other academies.

AND the system SHALL NOT display `PLATFORM_ADMIN`, `SUPER_ADMIN`, or legacy `ADMIN` users.

AND the system SHALL allow filtering and searching by name, email, role, and status within the administrator's academy only.

---

# User Profile Access

## Scenario: View User Profile

IF the authenticated user has the role `ACADEMY_ADMIN`

WHEN the user opens a user profile

THEN the system SHALL allow viewing profile details for users belonging to the administrator's assigned academy only.

AND the system SHALL deny access to profiles belonging to users from other academies.

AND the API SHALL return HTTP 403 Forbidden when access is denied.

---

# User Creation

## Scenario: Create Standard User

IF the authenticated user has the role `ACADEMY_ADMIN`

WHEN the user creates a new Standard User

THEN the system SHALL create the user within the administrator's assigned academy.

AND the system SHALL automatically assign the administrator's `academy_id` to the new user.

AND the system SHALL validate required user fields.

AND the administrator SHALL NOT be able to assign users to another academy.

AND the system SHALL create an audit log entry.

---

## Scenario: Create Academy Administrator

IF the authenticated user has the role `ACADEMY_ADMIN`

WHEN the user creates a new Academy Administrator

THEN the system SHALL create the user within the authenticated administrator's assigned academy.

AND the system SHALL automatically assign the authenticated administrator's `academy_id` to the new user.

AND the administrator SHALL NOT be able to assign the new Academy Administrator to another academy.

AND the administrator SHALL NOT be able to create `PLATFORM_ADMIN`, `SUPER_ADMIN`, or legacy `ADMIN` users.

AND the system SHALL validate required user fields.

AND the system SHALL create an audit log entry.

---

# User Editing

## Scenario: Edit User Within Assigned Academy

IF the authenticated user has the role `ACADEMY_ADMIN`

WHEN the user edits a user account belonging to their assigned academy

THEN the system SHALL allow editing permitted user profile details.

AND the system SHALL allow updating account status.

AND the system SHALL allow managing Standard Users, legacy Users, Academy Administrators, and legacy Academy Owners from the assigned academy only.

AND the system SHALL prevent changing the user's academy assignment.

AND the system SHALL prevent changing any same-academy user to `PLATFORM_ADMIN`, `SUPER_ADMIN`, or legacy `ADMIN`.

AND the system SHALL create an audit log entry.

---

# User Account Disable

## Scenario: Disable User Account

IF the authenticated user has the role `ACADEMY_ADMIN`

WHEN the user disables a Standard User or Academy Administrator account belonging to their assigned academy

THEN the system SHALL mark the account as disabled.

AND the disabled user SHALL no longer be able to authenticate.

AND the system SHALL create an audit log entry.

---

## Scenario: Prevent Disabling Users Outside Assigned Academy

IF the authenticated user has the role `ACADEMY_ADMIN`

WHEN the user attempts to disable an account belonging to another academy

THEN the backend SHALL reject the request.

AND the API SHALL return HTTP 403 Forbidden.

AND the account status SHALL remain unchanged.

---

# Self-Disable Protection

## Scenario: Prevent Academy Administrator From Disabling Their Own Account

IF the authenticated user has the role `ACADEMY_ADMIN`

WHEN the user attempts to disable their own account

THEN the backend SHALL reject the request.

AND the API SHALL return HTTP 403 Forbidden.

AND the frontend SHALL NOT display self-disable actions.

AND the administrator account SHALL remain active.

---

# User Role Management

## Scenario: Manage Same-Academy User Roles

IF the authenticated user has the role `ACADEMY_ADMIN`

WHEN the user changes a same-academy user's role

THEN the system SHALL allow role changes between `STANDARD_USER` and `ACADEMY_ADMIN` only.

AND the system SHALL preserve the user's assigned academy as the authenticated administrator's academy.

AND the system SHALL reject role changes for users outside the authenticated administrator's academy.

AND the system SHALL reject role changes to `PLATFORM_ADMIN`, `SUPER_ADMIN`, or legacy `ADMIN`.

AND the system SHALL create an audit log entry.

---

# Academy Visibility

## Scenario: View Assigned Academy

IF the authenticated user has the role `ACADEMY_ADMIN`

WHEN the user opens academy information

THEN the system SHALL display details for the administrator's assigned academy only.

AND the system SHALL NOT display information for other academies.

---

## Scenario: Edit Assigned Academy Information

IF the authenticated user has the role `ACADEMY_ADMIN`

WHEN the user edits academy information for their assigned academy

THEN the system SHALL update permitted academy profile fields for that assigned academy only.

AND the system SHALL preserve protected platform-controlled fields unless the user's policy explicitly allows changing them.

AND the system SHALL create an audit log entry.

---

# Academy Modification Restrictions

## Scenario: Prevent Academy Administrator From Managing Other Academies

IF the authenticated user has the role `ACADEMY_ADMIN`

WHEN the user attempts to create, edit, delete, or manage another academy

THEN the backend SHALL reject the request.

AND the API SHALL return HTTP 403 Forbidden.

---

# Open Mat Visibility

## Scenario: View Open Mats For Assigned Academy

IF the authenticated user has the role `ACADEMY_ADMIN`

WHEN the user views Open Mats

THEN the system SHALL display Open Mats belonging to the administrator's assigned academy only.

AND the system SHALL NOT display Open Mats belonging to other academies.

---

# Roll Event Management

## Scenario: Create Roll Event For Assigned Academy

IF the authenticated user has the role `ACADEMY_ADMIN`

WHEN the user creates a roll event or Open Mat

THEN the system SHALL create the event for the administrator's assigned academy only.

AND the administrator SHALL NOT be able to select or submit another academy for the event.

AND the system SHALL validate required event fields.

AND the system SHALL create an audit log entry.

---

## Scenario: Edit Roll Event For Assigned Academy

IF the authenticated user has the role `ACADEMY_ADMIN`

WHEN the user edits a roll event or Open Mat belonging to their assigned academy

THEN the system SHALL allow editing permitted event details.

AND the system SHALL prevent moving the event to another academy.

AND the system SHALL create an audit log entry.

---

## Scenario: Delete Roll Event For Assigned Academy

IF the authenticated user has the role `ACADEMY_ADMIN`

WHEN the user deletes a roll event or Open Mat belonging to their assigned academy

THEN the system SHALL delete or deactivate the event according to the existing event deletion behavior.

AND the system SHALL create an audit log entry.

---

## Scenario: Prevent Cross-Academy Roll Event Management

IF the authenticated user has the role `ACADEMY_ADMIN`

WHEN the user attempts to view, create, edit, delete, or manage a roll event or Open Mat for another academy

THEN the backend SHALL reject the request.

AND the API SHALL return HTTP 403 Forbidden.

AND the event SHALL remain unchanged.

---

# API Authorization

## Scenario: Academy Administrator API Access

IF the authenticated user has the role `ACADEMY_ADMIN`

WHEN the user calls a protected academy administration API endpoint

THEN the backend SHALL validate authentication.

AND the backend SHALL validate the user is active.

AND the backend SHALL validate the `ACADEMY_ADMIN` role.

AND the backend SHALL validate that the requested resource belongs to the administrator's assigned academy.

AND the backend SHALL reject cross-academy access with HTTP 403 Forbidden.

AND every server action and API route used by the shared Admin Board SHALL enforce the same academy-scoped policy as the frontend.

---

# Frontend Requirements

## Scenario: Render Shared Admin Board Navigation

IF the authenticated user has the role `ACADEMY_ADMIN`

WHEN the frontend renders the shared Admin Board navigation menu

THEN the menu SHALL display the shared Admin Board navigation shell.

AND the menu SHALL display academy administration features for the assigned academy only.

AND the menu SHALL display user management for the assigned academy only.

AND the menu SHALL display roll event management for the assigned academy only.

AND the menu SHALL NOT display platform administration areas, platform settings, academy claim review, email operations, Platform Admin activity surfaces, or Super Admin-only features.

AND the menu SHALL NOT display academy management for other academies.

AND self-disable actions SHALL NOT be displayed.

---

# Change Password

## Scenario: Change Password

IF the authenticated user has the role `ACADEMY_ADMIN`

AND there is a Change Password button or link

WHEN the user clicks the Change Password button or link and enters a valid new password

THEN the system SHALL update the user's password.

AND the user's password SHALL be changed to the new password successfully.

---

# Test Requirements

## Scenario: Academy Administrator Regression Tests

IF Academy Administrator RBAC implementation is complete

WHEN automated tests run

THEN tests SHALL verify Academy Administrators can view users from their own academy only.

AND tests SHALL verify Academy Administrators cannot view users from other academies.

AND tests SHALL verify Academy Administrators can create Standard Users within their own academy.

AND tests SHALL verify Academy Administrators can disable users within their own academy.

AND tests SHALL verify Academy Administrators cannot disable users from other academies.

AND tests SHALL verify Academy Administrators can view user profiles within their own academy.

AND tests SHALL verify Academy Administrators cannot access profiles belonging to other academies.

AND tests SHALL verify Academy Administrators cannot manage academies other than their own.

AND tests SHALL verify Academy Administrators cannot disable themselves.

AND tests SHALL verify academy isolation is enforced on all protected API endpoints.

---

# Acceptance Criteria

* Only make changes that directly affect these requirements.
* Maintain backward compatibility with existing functionality.
* Enforce academy-level data isolation at both frontend and backend layers.
* All academy-scoped queries SHALL be filtered by the authenticated administrator's `academy_id`.
* Cross-academy access SHALL return HTTP 403 Forbidden.
* Existing Platform Administrator functionality SHALL remain unchanged.

---

# Current Implementation Status

Reviewed against source code on 2026-06-05.

Status: Mostly implemented.

Implemented:

* Academy admin role helper exists.
* Academy-scoped query helpers exist for users, academies, and events.
* Academy admins are scoped to their assigned academy in admin users, academies, and open mats flows.
* Academy admins can manage users within their academy according to current permission rules.
* Academy admins cannot access platform-level admin functionality.
* Change password exists through `/dashboard/password`.

MVP gaps or notes:

* The separate simple user profile view is not implemented yet.
* Automated tests for every academy-isolation path are not visible.
