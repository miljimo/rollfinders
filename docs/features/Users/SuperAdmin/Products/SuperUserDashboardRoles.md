# PRD: Super User IF/WHEN/THEN Requirements

## Feature Branch

`feature/super_admin_permissions_and_roles`

## Role

`SUPER_ADMIN`

## Objective

Implement Super User access control using strict IF/WHEN/THEN requirements so AI agents can implement the role without misunderstanding the permission boundaries.

The Super User is the highest authority on the platform, but the system must still prevent unsafe self-actions and protect the last active Super User account.

---
# Super User Dashboard Access
### Scenario:  Access Super User Dashboard

IF a valid Super User account exists

WHEN the user enters a valid username and password and submits the login form

THEN the system SHALL authenticate the user and redirect them to the User Dashboard.

AND the dashboard SHALL display:

* User full name
* User profile avatar (if available)
* Registration date
* Academy name if any or removed the field.
* Change Password

AND the dashboard SHALL display platform-level administration features.

AND the dashboard SHALL display academy management features.

AND the dashboard SHALL display user management features.

AND the dashboard SHALL display role management features.

---

## Scenario: View Academies Created By Platform Admins

IF the authenticated user has the role `SUPER_ADMIN`

WHEN the user opens the Super Admin Dashboard

THEN the dashboard SHALL include a dedicated "Academies Created By Platform Admins" surface.

AND the surface SHALL list academies whose `createdById` belongs to a user with the `PLATFORM_ADMIN` role.

AND the list SHALL include:

* Academy name
* Verification status
* Created date
* Creating Platform Admin name
* Creating Platform Admin email
* City or location summary where available
* Linked academy detail action

AND the list SHALL be paginated whenever records exist.

AND the first page SHALL default to 5 rows.

AND the surface SHALL show pagination controls as long as there is at least one record, even when the first page contains all records.

AND the surface SHALL support sorting by created date and Platform Admin where the existing table component supports sortable columns.

AND the surface SHALL preserve existing Super Admin access to the full academy management page.

AND Platform Admin users SHALL NOT see this Super Admin review surface.

AND Academy Admin and Standard User accounts SHALL NOT see this Super Admin review surface.

---

## Scenario: View Platform Admin Academy Creation Stats

IF the authenticated user has the role `SUPER_ADMIN`

WHEN the Super Admin Dashboard renders the "Academies Created By Platform Admins" surface

THEN the dashboard SHALL display stats for Platform Admin-created academies.

AND the stats SHALL include:

* Total academies created by Platform Admins
* Verified academies created by Platform Admins
* Pending verification academies created by Platform Admins
* Platform Admins who have created at least one academy
* New Platform Admin-created academies this month

AND each stat SHALL be calculated only from academies where `createdById` is a Platform Admin user.

AND these stats SHALL NOT replace the existing platform-wide academy stats.

AND these stats SHALL be visually grouped with the Platform Admin-created academy list so Super Admins can distinguish contribution review from global academy totals.

AND any stat indicator copy SHALL follow the shared Admin Dashboard stat indicator requirements in:

`docs/features/Users/Platform/Products/Completed/AdminDashboardStatIndicators.md`

---

# User Visibility

## Scenario: View All Users

IF the authenticated user has the role `SUPER_ADMIN`

WHEN the user opens the user management page

THEN the system SHALL display all users across all academies.

AND the system SHALL include Platform Admins, Academy Admins, and Standard Users.

AND the system SHALL allow filtering and searching by name, email, role, academy, and status.

---

# User Creation

## Scenario: Create User

IF the authenticated user has the role `SUPER_ADMIN`

WHEN the user creates a new user

THEN the system SHALL allow the Super User to assign one of the permitted roles.

AND the system SHALL validate required academy assignment rules.

AND Academy Admin users SHALL require an `academy_id`.

AND Standard Users SHALL require an `academy_id`.

AND Super Users and Platform Admins MAY have a NULL `academy_id`.

---

# User Editing

## Scenario: Edit User

IF the authenticated user has the role `SUPER_ADMIN`

WHEN the user edits another user account

THEN the system SHALL allow editing of user profile details, role, academy assignment, and account status.

AND the system SHALL prevent invalid role and academy combinations.

AND the system SHALL create an audit log entry for the change.

---

# User Promotion

## Scenario: Promote User

IF the authenticated user has the role `SUPER_ADMIN`

WHEN the user promotes another user

THEN the system SHALL allow promotion to Platform Admin, Academy Admin, or Super User where business rules allow it.

AND the system SHALL validate that required academy assignment exists for Academy Admin users.

AND the system SHALL create an audit log entry for the promotion, including the super `admin id`, and promotion details.

---

# User Demotion

## Scenario: Demote Another User

IF the authenticated user has the role `SUPER_ADMIN`

WHEN the user demotes another user

THEN the system SHALL allow demotion to a lower role where business rules allow it.

AND the system SHALL validate that Standard Users and Academy Admins have a valid academy assignment.

AND the system SHALL create an audit log entry for the demotion.

---

# Self-Demotion Protection

## Scenario: Prevent Super User From Demoting Themselves

IF the authenticated user has the role `SUPER_ADMIN`

WHEN the user attempts to demote their own account

THEN the backend SHALL reject the request.

AND the API SHALL return HTTP 403 Forbidden.

AND the frontend SHALL not display self-demotion actions.

AND the user's role SHALL remain unchanged.

---

# Self-Deletion Protection

## Scenario: Prevent Super User From Deleting Themselves

IF the authenticated user has the role `SUPER_ADMIN`

WHEN the user attempts to delete their own account

THEN the backend SHALL reject the request.

AND the API SHALL return HTTP 403 Forbidden.

AND the frontend SHALL not display self-delete actions.

AND the user's account SHALL remain active.

---

# Last Super User Protection

## Scenario: Prevent Disabling Last Active Super User

IF the authenticated user has the role `SUPER_ADMIN`

AND the target Super User is the last active Super User in the platform

WHEN the authenticated user attempts to disable, delete, or demote that target Super User

THEN the backend SHALL reject the request.

AND the API SHALL return HTTP 409 Conflict.

AND the system SHALL return a clear error message explaining that at least one active Super User must remain.

---

## Scenario: Enabling Disabled Super Users

**GIVEN** the authenticated user has the role `SUPER_ADMIN`  
**AND** there are other super users whose account status is `DISABLED`  
**WHEN** the user clicks the `Enable` button for a disabled super user  
**THEN** the system shall update the selected user's account status to `ENABLED`  
**AND** the button state shall be updated to reflect the new status  
**AND** an audit log entry shall be created containing:
- The action performed (`SUPER_USER_ENABLED`)
- The ID of the super user that was enabled
- The ID of the authenticated `SUPER_ADMIN` who performed the action
- The date and time of the action
- The previous status (`DISABLED`)
- The new status (`ENABLED`)


# Academy Management

## Scenario: View All Academies

IF the authenticated user has the role `SUPER_ADMIN` or `PLATFORM_ADMIN`

WHEN the user opens the academy management page

THEN the system SHALL display all academies.

AND the system SHALL support pagination.

AND the system SHALL support search by academy name, location, status, and owner where available.

---

## Scenario: Create Academy

IF the authenticated user has the role `SUPER_ADMIN` or `PLATFORM_ADMIN`

WHEN the user submits valid academy creation details

THEN the system SHALL create the academy.

AND the system SHALL validate required academy fields.

AND the system SHALL create an audit log entry.

---

## Scenario: Edit Academy

IF the authenticated user has the role `SUPER_ADMIN` or `PLATFORM_ADMIN`

WHEN the user edits an academy

THEN the system SHALL update the academy record.

AND the system SHALL preserve existing academy relationships unless explicitly changed.

AND the system SHALL create an audit log entry.

---

## Scenario: Delete Academy

IF the authenticated user has the role `SUPER_ADMIN`, or has the role `PLATFORM_ADMIN` and created the academy

WHEN the user deletes an academy

THEN the backend SHALL validate whether academy deletion is safe.

AND the system SHALL prevent accidental orphaning of users, rolls, open mats, or related records.

AND the system SHALL either soft-delete the academy or block deletion if dependent data cannot be safely handled.

AND the system SHALL create an audit log entry.

---

# Open Mat Management

## Scenario: Manage Any Open Mat

IF the authenticated user has the role `SUPER_ADMIN`

WHEN the user views, edits, or deletes an Open Mat

THEN the system SHALL allow access to Open Mats across all academies.

AND the system SHALL validate the target Open Mat exists.

AND the system SHALL create an audit log entry for edits and deletions.

---

# Platform Settings

## Scenario: Access Platform Settings

IF the authenticated user has the role `SUPER_ADMIN`

WHEN the user opens platform settings

THEN the system SHALL display platform-level settings.

AND the system SHALL allow permitted platform configuration changes.

AND the system SHALL create an audit log entry for all changes.

---

# API Authorization

## Scenario: Super User API Access

IF the authenticated user has the role `SUPER_ADMIN`

WHEN the user calls a protected platform API endpoint

THEN the backend SHALL validate authentication.

AND the backend SHALL validate the user is active.

AND the backend SHALL validate the `SUPER_ADMIN` role.

AND the backend SHALL still enforce self-protection and last-active-Super-User rules.

---

# Frontend Requirements

## Scenario: Render Super User Navigation

IF the authenticated user has the role `SUPER_ADMIN`

WHEN the frontend renders the navigation menu

THEN the menu SHALL display Super User permitted areas only.

AND the menu SHALL include platform administration, academy management, user management, role management, and settings.

AND self-delete and self-demotion actions SHALL NOT be displayed.

---

# Test Requirements

## Scenario: Super User Regression Tests

IF Super User RBAC implementation is complete

WHEN automated tests run

THEN tests SHALL verify Super User access to platform, academy, user, and Open Mat management.

AND tests SHALL verify Super User cannot delete themselves.

AND tests SHALL verify Super User cannot demote themselves.

AND tests SHALL verify the last active Super User cannot be disabled, deleted, or demoted.


##  Change Password 
IF the authenticated user has the role `SUPER_ADMIN`

AND there is a Change Password button or link

WHEN the user clicks the Change Password button or link and enters a valid new password

THEN the system should update the user's password

AND the user's password should be changed to the new password successfully.


Acceptable Criteria
 
 Above functionality is tested and working
 Maintaining backward compatibility with existing functionality.

---

# Current Implementation Status

Reviewed against source code on 2026-06-05.

Status: Mostly implemented.

Implemented:

* Super admin/admin roles are treated as super-admin roles by admin helpers.
* Super admins can access admin dashboard, academy management, user management, open mat management, and settings.
* User management supports create, edit, disable, enable, delete, password email, and role changes.
* Last active super-user and protected-account safeguards are present in user management paths.
* Change password exists through `/dashboard/password`.

MVP gaps or notes:

* Automated tests for every super-user RBAC scenario are not visible.
* Dedicated role-management UI is represented through user management rather than a standalone role module.
