# PRD: Academy Administrator IF/WHEN/THEN Requirements

## Feature Branch

`feature/academic_admin_permissions_and_roles`

## Role

`ACADEMY_ADMIN`

## Objective

Implement Academy Administrator access control using strict IF/WHEN/THEN requirements so AI agents can implement the role without misunderstanding permission boundaries.

The Academy Administrator SHALL only have visibility and management capabilities within their assigned academy.

---

# Academy Administrator Dashboard Access

## Scenario: Access Academy Administrator Dashboard

IF the authenticated user has the role `ACADEMY_ADMIN`

WHEN the user logs in successfully

THEN the system SHALL redirect the user to the Academy Administrator Dashboard.

AND the dashboard SHALL display:
* User full name
* User profile avatar (if available)
* Registration date
* Academy name if any or removed the field.

AND the dashboard SHALL display academy-level administration features for the administrator's assigned academy only.

AND the dashboard SHALL display user management features for the administrator's assigned academy only.

AND the dashboard SHALL NOT display platform administration features.

AND the dashboard SHALL NOT display data belonging to any other academy.

---

# User Visibility

## Scenario: View Users Within Assigned Academy

IF the authenticated user has the role `ACADEMY_ADMIN`

WHEN the user opens the user management page

THEN the system SHALL display users belonging to the administrator's assigned academy only.

AND the system SHALL include Academy Administrators and Standard Users from the same academy only.

AND the system SHALL NOT display users from other academies.

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

# User Editing

## Scenario: Edit User Within Assigned Academy

IF the authenticated user has the role `ACADEMY_ADMIN`

WHEN the user edits a user account belonging to their assigned academy

THEN the system SHALL allow editing permitted user profile details.

AND the system SHALL allow updating account status.

AND the system SHALL prevent changing the user's academy assignment.

AND the system SHALL create an audit log entry.

---

# User Account Disable

## Scenario: Disable User Account

IF the authenticated user has the role `ACADEMY_ADMIN`

WHEN the user disables a Standard User account belonging to their assigned academy

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

# Academy Visibility

## Scenario: View Assigned Academy

IF the authenticated user has the role `ACADEMY_ADMIN`

WHEN the user opens academy information

THEN the system SHALL display details for the administrator's assigned academy only.

AND the system SHALL NOT display information for other academies.

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

# API Authorization

## Scenario: Academy Administrator API Access

IF the authenticated user has the role `ACADEMY_ADMIN`

WHEN the user calls a protected academy administration API endpoint

THEN the backend SHALL validate authentication.

AND the backend SHALL validate the user is active.

AND the backend SHALL validate the `ACADEMY_ADMIN` role.

AND the backend SHALL validate that the requested resource belongs to the administrator's assigned academy.

AND the backend SHALL reject cross-academy access with HTTP 403 Forbidden.

---

# Frontend Requirements

## Scenario: Render Academy Administrator Navigation

IF the authenticated user has the role `ACADEMY_ADMIN`

WHEN the frontend renders the navigation menu

THEN the menu SHALL display academy administration features only.

AND the menu SHALL display user management for the assigned academy only.

AND the menu SHALL NOT display platform administration areas.

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
