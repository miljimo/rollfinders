# PRD: Platform Admin IF/WHEN/THEN Requirements

## Feature Branch

`feature/platform_admin_permissions_and_roles`

## Schema Impact

No new schema changes are required for this PRD when Platform Admin role, user status, protected-account fields, academy assignment, and admin audit logs already exist.

IF these role and dashboard requirements are implemented

WHEN the deployment is prepared

THEN no new database migration script SHALL be required for this PRD.

AND deployment SHALL verify that prerequisite Platform Admin RBAC migrations have already been applied before enabling the role.

## Role

`PLATFORM_ADMIN`

## Objective

Implement Platform Admin access control using strict IF/WHEN/THEN requirements so AI agents can implement the role without misunderstanding permission boundaries.

Platform Admins are operational administrators. They can manage platform-wide academy operations, support users, moderate open mats, and manage Academy Admin and Standard User accounts. They cannot manage Super Admins, create Super Admins, create peer Platform Admin accounts, or change permissions for existing Platform Admins.



---

# Platform Admin Dashboard Access

## Scenario: Access Platform Admin Dashboard

IF the authenticated user has the role `PLATFORM_ADMIN`

AND the user's account status is `ACTIVE`

WHEN the user logs in successfully

THEN the system SHALL redirect the user to the User Dashboard /dashboard
AND the dashboard SHALL display:
* User full name
* User profile avatar (if available)
* Registration date
* Academy name if any or removed the field.
* Reused the existing admin dashboard

AND the dashboard SHALL display platform operations features.

AND the dashboard SHALL display academy management features.

AND the dashboard SHALL display user management features for permitted roles only.

AND the dashboard SHALL NOT display Super Admin-only controls.

---

# User Visibility

## Scenario: View Permitted Users

IF the authenticated user has the role `PLATFORM_ADMIN`

WHEN the user opens the user management page

THEN the system SHALL display Academy Admins and Standard Users across all academies.

AND the system SHALL display other Platform Admins only as read-only protected records when peer visibility is enabled.

AND peer Platform Admin records SHALL NOT show the `PLATFORM_ADMIN` role value to the logged-in Platform Admin.

AND peer Platform Admin records SHALL NOT show email, academy assignment, email status, last login time, or permission-management actions.

AND peer Platform Admin records MAY show only id, name, status, disabled state, protected status, and created date.

AND the system SHALL NOT display Super Admin or legacy Admin users.

AND the system SHALL allow filtering and searching by name, email, role, academy, and status.

---

# User Creation

## Scenario: Create Permitted User

IF the authenticated user has the role `PLATFORM_ADMIN`

WHEN the user creates a new user

THEN the system SHALL allow creation of `ACADEMY_ADMIN` and `STANDARD_USER` accounts only.

AND the system SHALL require an `academy_id` for `ACADEMY_ADMIN` users.

AND the system SHALL require an `academy_id` for `STANDARD_USER` users.

AND the system SHALL reject attempts to create `SUPER_ADMIN` users.

AND the system SHALL reject attempts to create `PLATFORM_ADMIN` users.

AND the system SHALL create an audit log entry containing the actor user id, target user id, assigned role, academy id, and timestamp.

---

# User Editing

## Scenario: Edit Academy Admin Or Standard User

IF the authenticated user has the role `PLATFORM_ADMIN`

WHEN the user edits an `ACADEMY_ADMIN` or `STANDARD_USER` account

THEN the system SHALL allow editing of profile details, permitted role, academy assignment, and account status.

AND the system SHALL prevent invalid role and academy combinations.

AND the system SHALL create an audit log entry for the change.

---

## Scenario: Prevent Viewing Or Editing Super Admin

IF the authenticated user has the role `PLATFORM_ADMIN`

WHEN the user attempts to view, edit, disable, delete, promote, demote, or reset permissions for a `SUPER_ADMIN` account

THEN the backend SHALL reject the request.

AND the API SHOULD return HTTP 404 Not Found for read attempts to avoid confirming the account exists.

AND the API SHALL return HTTP 403 Forbidden for mutation attempts where the target is known through an authorized flow.

AND the frontend SHALL NOT display Super Admin records or actions.

---

## Scenario: Peer Platform Admin Read-Only Protected Visibility

IF the authenticated user has the role `PLATFORM_ADMIN`

WHEN the user views another `PLATFORM_ADMIN` account in user management

THEN the system SHALL show the peer account only as a protected read-only record.

AND the system SHALL NOT show the peer account's role as `PLATFORM_ADMIN`.

AND the system SHALL NOT show the peer account's email, academy assignment, email status, last login time, or permission-management actions.

AND the frontend SHALL show protected status instead of role-management controls.

---

## Scenario: Prevent Managing Peer Platform Admin Permissions

IF the authenticated user has the role `PLATFORM_ADMIN`

WHEN the user attempts to create, delete, promote, demote, disable, reset password, or change permissions for a `PLATFORM_ADMIN` account

THEN the backend SHALL reject the request.

AND the API SHALL return HTTP 403 Forbidden.

AND the frontend SHALL NOT display peer Platform Admin management actions.

---

# User Promotion

## Scenario: Promote Standard User

IF the authenticated user has the role `PLATFORM_ADMIN`

WHEN the user promotes a `STANDARD_USER`

THEN the system SHALL allow promotion to `ACADEMY_ADMIN` only.

AND the system SHALL validate that the target user has a valid academy assignment.

AND the system SHALL create an audit log entry containing the platform admin id, target user id, previous role, new role, academy id, and timestamp.

---

## Scenario: Prevent Promotion To Platform Or Super Admin

IF the authenticated user has the role `PLATFORM_ADMIN`

WHEN the user attempts to promote another user to `PLATFORM_ADMIN` or `SUPER_ADMIN`

THEN the backend SHALL reject the request.

AND the API SHALL return HTTP 403 Forbidden.

AND the user's role SHALL remain unchanged.

---

# User Demotion

## Scenario: Demote Academy Admin

IF the authenticated user has the role `PLATFORM_ADMIN`

WHEN the user demotes an `ACADEMY_ADMIN`

THEN the system SHALL allow demotion to `STANDARD_USER`.

AND the system SHALL validate that the target user has a valid academy assignment.

AND the system SHALL create an audit log entry containing the platform admin id, target user id, previous role, new role, academy id, and timestamp.

---

# Self-Action Protection

## Scenario: Prevent Self-Demotion

IF the authenticated user has the role `PLATFORM_ADMIN`

WHEN the user attempts to demote their own account

THEN the backend SHALL reject the request.

AND the API SHALL return HTTP 403 Forbidden.

AND the frontend SHALL NOT display self-demotion actions.

AND the user's role SHALL remain unchanged.

---

## Scenario: Prevent Self-Deletion Or Self-Disable

IF the authenticated user has the role `PLATFORM_ADMIN`

WHEN the user attempts to delete or disable their own account

THEN the backend SHALL reject the request.

AND the API SHALL return HTTP 403 Forbidden.

AND the frontend SHALL NOT display self-delete or self-disable actions.

AND the user's account SHALL remain active.

---

# Academy Management

## Scenario: View All Academies

IF the authenticated user has the role `PLATFORM_ADMIN`

WHEN the user opens the academy management page

THEN the system SHALL display all academies.

AND the system SHALL support pagination.

AND the system SHALL support search by academy name, location, status, and owner where available.

---

## Scenario: Edit Academy Operational Details

IF the authenticated user has the role `PLATFORM_ADMIN`

WHEN the user edits an academy

THEN the system SHALL allow updates to operational academy fields.

AND the system SHALL preserve ownership, billing, and protected platform relationships unless a Super Admin changes them.

AND the system SHALL create an audit log entry.

---

## Scenario: Create Academies

IF the authenticated user has the role `PLATFORM_ADMIN`

WHEN the user opens the Admin Dashboard Academies panel

THEN the system SHALL make visible the `New Academy` button.

WHEN the user selects `New Academy`

THEN the system SHALL open a New Academy pop-up dialog without leaving the Admin Dashboard.

WHEN the user fills all required academy inputs

AND selects `Create Academy`

THEN the system SHALL create the Academy record.

AND the system SHALL NOT create the Academy record when required inputs are missing or invalid.

AND the system SHALL store the Platform Admin actor as the academy creator.

AND the system SHALL create an audit log entry.

AND the page SHALL navigate back to the Admin Dashboard Academies panel at `/admin?panel=academies`.

Acceptance criteria:

* A user with role `PLATFORM_ADMIN` can see the `New Academy` button in the Admin Dashboard Academies panel.
* Selecting `New Academy` opens a New Academy dialog.
* Submitting valid required fields creates one Academy record.
* The created Academy stores the authenticated Platform Admin as `createdById`.
* Successful creation returns the user to `/admin?panel=academies`.
* Missing or invalid required fields do not create an Academy record.
* Missing or invalid required fields keep the user in the dialog flow with validation errors.
* Users without a platform-level admin role cannot create Academies.

---

## Scenario: Delete Created Academy

IF the authenticated user has the role `PLATFORM_ADMIN`

AND the academy was created by that Platform Admin

WHEN the user deletes the academy

THEN the backend SHALL allow the delete operation.

AND the system SHALL create an audit log entry.

AND the system SHALL return the user to `/admin?panel=academies`.

---

## Scenario: Prevent Protected Academy Ownership Or Deletion Changes

IF the authenticated user has the role `PLATFORM_ADMIN`

WHEN the user attempts to delete an academy they did not create, transfer ownership, or change protected academy ownership fields

THEN the backend SHALL reject the request.

AND the API SHALL return HTTP 403 Forbidden.

AND the academy SHALL remain unchanged.

---

# Open Mat Management

## Scenario: Manage Any Open Mat

IF the authenticated user has the role `PLATFORM_ADMIN`

WHEN the user views, edits, disables, or deletes an Open Mat

THEN the system SHALL allow access to Open Mats across all academies.

AND the system SHALL validate the target Open Mat exists.

AND the system SHALL create an audit log entry for edits, disables, and deletions.

---

# Platform Settings

## Scenario: Prevent Restricted Platform Settings Access

IF the authenticated user has the role `PLATFORM_ADMIN`

WHEN the user opens platform settings for billing, feature flags, role policy, owner configuration, or protected Super Admin configuration

THEN the backend SHALL reject the request.

AND the API SHALL return HTTP 403 Forbidden.

AND the frontend SHALL NOT display restricted platform settings navigation.

---

# API Authorization

## Scenario: Platform Admin API Access

IF the authenticated user has the role `PLATFORM_ADMIN`

WHEN the user calls a protected platform operations API endpoint

THEN the backend SHALL validate authentication.

AND the backend SHALL validate the user is active.

AND the backend SHALL validate the `PLATFORM_ADMIN` role.

AND the backend SHALL enforce target-user role restrictions.

AND the backend SHALL enforce self-protection rules.

AND the backend SHALL reject Super Admin-only operations.

---

# Frontend Requirements

## Scenario: Render Platform Admin Navigation

IF the authenticated user has the role `PLATFORM_ADMIN`

WHEN the frontend renders the navigation menu

THEN the menu SHALL display Platform Admin permitted areas only.

AND the menu SHALL include academy management, user management, open mat moderation, and permitted platform operations.

AND the menu SHALL include direct side-panel entries for every visible Platform Admin Quick Action.

AND the side panel SHALL include, at minimum, permitted links for:

* Dashboard
* Manage Academies
* Manage Open Mats
* Manage Users
* Academy Claims, when claim review is permitted
* Map, when map access is permitted
* Settings

AND Settings SHALL be the final primary side-panel item before Help & Support and Logout.

AND the menu SHALL NOT include Super Admin-only areas, billing controls, feature flags, protected owner settings, or peer Platform Admin role management.

AND self-delete, self-disable, and self-demotion actions SHALL NOT be displayed.

---

# Change Password

## Scenario: Change Own Password

IF the authenticated user has the role `PLATFORM_ADMIN`

AND the user opens the admin Settings panel

WHEN the user clicks the Change Password card action

THEN the system SHALL open a modal dialog containing the Change Password form.

WHEN the user enters a valid new password in the modal Change Password form

THEN the system SHALL update the user's password.

AND the user's password SHALL be changed to the new password successfully.

AND the password change SHALL apply only to the authenticated Platform Admin's own account.

AND the system SHALL create an audit log entry for the password change without storing the password value.

---

# Test Requirements

## Scenario: Platform Admin Regression Tests

IF Platform Admin RBAC implementation is complete

WHEN automated tests run

THEN tests SHALL verify Platform Admin access to permitted academy, user, and Open Mat management.

AND tests SHALL verify Platform Admin can create Academies.

AND tests SHALL verify Platform Admin can delete only Academies they created.

AND tests SHALL verify Platform Admin cannot access or manage Super Admin users.

AND tests SHALL verify Platform Admin cannot create, promote, demote, disable, or delete Platform Admin users.

AND tests SHALL verify Platform Admin cannot delete or disable themselves.

AND tests SHALL verify Platform Admin cannot demote themselves.

AND tests SHALL verify Platform Admin cannot access Super Admin-only platform settings.

---

# Acceptance Criteria

Only make changes that directly affect these requirements.

Maintain backward compatibility with existing functionality.

Preserve the existing User Dashboard pattern, layout, navigation, and user experience.

---

# Current Implementation Status

Reviewed against source code on 2026-06-05.

Status: Mostly implemented.

Implemented:

* Platform admin role helper exists.
* Platform admins can access admin dashboard and permitted admin modules.
* Platform admins can view/manage allowed users and are blocked from protected super-admin/platform-level targets by current user management logic.
* Platform admins can create Academies through the Academies panel.
* Platform admins can manage academy and open mat workflows through admin modules.
* Platform admins can delete only Academies they created.
* Change password exists through `/dashboard/password`.

MVP gaps or notes:

* Analytics access is documented but not implemented because analytics is missing.
* Automated tests for every platform-admin restriction are not visible.
