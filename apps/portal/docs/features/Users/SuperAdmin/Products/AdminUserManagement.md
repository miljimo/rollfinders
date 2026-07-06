# PRD: Admin User Management Enhancement

## Feature Name

Admin User Management Module

## Objective

Create a dedicated user management area for administrators so user-related workflows are no longer handled inside the main dashboard panel.

The Users card on `/admin` should navigate to a dedicated user management page where authorized administrators can review, edit, disable, delete, and promote users.

## Proposed Route

```text
/admin/users
```

## Current Problem

The main admin dashboard currently includes a Users panel inline with other operational panels. This makes the dashboard crowded and limits room for user management controls as the platform grows.

Administrators need a dedicated page for user operations, similar to the dedicated Academy Management module.

## Scope

In scope:

* Add a dedicated user management page.
* Move user-related listing and management controls out of the main `/admin` page.
* Update the `/admin` Users card link to navigate to `/admin/users`.
* Provide admin controls to:
  * Edit user details
  * Disable users
  * Enable users
  * Delete users
  * Send password-change emails to users
* Preserve protected super-admin safeguards.
* Audit all user management actions.

Out of scope:

* User self-service profile editing
* Bulk user import/export
* Multi-factor authentication

## Permissions

Platform admins may:

* View users.

Super admins may:

* Create users.
* Edit users.
* Disable or enable users.
* Delete users.
* Promote standard users to platform admins.
* Demote platform admins to standard users.

Protected super-admin users must not be disabled, deleted, or demoted.

## User Management Page Requirements

### Listing

The `/admin/users` page should show a paginated user table.

Columns:

| Column | Description |
| --- | --- |
| Name | User display name |
| Email | User email |
| Role | Current platform role |
| Status | Active or disabled state |
| Email Status | Valid or invalid email status |
| Last Login | Last login timestamp |
| Created | Account creation timestamp |
| Actions | Edit, disable/enable, promote/demote, delete |

### Search

The page should support searching users by:

* Name
* Email

Search must be case-insensitive and server-side.

### Filtering

The page should support filtering by:

* Role
* Account status
* Email status

### Pagination

Pagination must be server-side.

Default page size:

```text
20
```

Supported page sizes:

```text
20
50
100
```

## Edit User Requirements

Administrators with permission should be able to edit:

* Name
* Email
* Role
* Status

Edits must validate:

* Email format
* Unique email address
* Valid role transition
* Protected super-admin restrictions

## Delete User Requirements

Super admins should be able to delete non-protected users.

Deleting a user must:

* Require super-admin authorization.
* Prevent deleting protected super-admin accounts.
* Remove or safely detach dependent records according to existing database constraints.
* Write an admin audit log entry.

## Disable User Requirements

Super admins should be able to disable and re-enable non-protected users.

Disabled users must not be able to authenticate.

All disable and enable actions must be audited.

## Promote User Requirements

Super admins should be able to:

* Promote standard users to platform admins.
* Demote platform admins to standard users.

Protected super-admin accounts must not be demoted.

All role changes must be audited.

## Password Change Email Requirements

Super admins should be able to send a password-change email to a user.

The system must:

* Create a single-use password reset token.
* Store token expiry.
* Queue the email through the reliable email delivery system.
* Include a link to a password reset page.
* Allow the user to set a new password from that link.
* Mark the token as used after a successful password change.
* Audit password-change email requests.

## Dashboard Changes

The Users card on `/admin` should navigate to:

```text
/admin/users
```

The main `/admin` page should no longer contain full inline user management controls once `/admin/users` exists.

## API Requirements

Recommended endpoints:

```http
GET /api/admin/users
GET /api/admin/users/{id}
PUT /api/admin/users/{id}
DELETE /api/admin/users/{id}
POST /api/admin/users/{id}/disable
POST /api/admin/users/{id}/enable
POST /api/admin/users/{id}/promote
POST /api/admin/users/{id}/demote
POST /api/admin/users/{id}/password-reset
```

All endpoints must enforce role-based authorization.

## Audit Requirements

Audit events:

* User created
* User edited
* User disabled
* User enabled
* User deleted
* User promoted
* User demoted
* Password change email sent
* Password changed through reset token

Audit metadata should include:

* Acting admin user ID
* Target user ID
* Target user email
* Previous values where relevant
* New values where relevant

## Acceptance Criteria

1. A dedicated `/admin/users` page exists.
2. The `/admin` Users card links to `/admin/users`.
3. User listing is paginated server-side.
4. Admins can search users by name or email.
5. Admins can filter users by role, status, and email status.
6. Super admins can edit non-protected users.
7. Super admins can disable and enable non-protected users.
8. Super admins can delete non-protected users.
9. Super admins can promote and demote non-protected users.
10. Protected super-admin users cannot be disabled, deleted, or demoted.
11. User management actions are audited.
12. Super admins can send users a password-change email.
13. Users can change their password using a valid reset-token link.
14. The main `/admin` page no longer contains full inline user management controls.
15. TypeScript, lint, and production build checks pass.

---

## Current Implementation Status

Reviewed against source code on 2026-06-05.

Status: Mostly implemented.

Implemented:

* Dedicated `/admin/users` page exists.
* User listing is server-side paginated.
* Search by name and email exists.
* Filters exist for role, account status, email status, and page size.
* Admins can create users through `CreateUserForm`.
* Admins can edit manageable users inline.
* Admins can disable and enable manageable users.
* Admins can delete manageable non-super-user accounts.
* Admins can send password reset/change emails.
* Protected super-admin safeguards exist.
* API routes exist for user detail, update, delete, disable, enable, promote, demote, and password reset.
* Audit logs are written for user create, edit, disable, enable, delete, promote, demote, and password email actions.

MVP gaps or notes:

* Promote/demote are available through API routes and role editing, but the table does not expose separate visible `Promote` and `Demote` buttons.
* Inline table editing works but is dense. Use `apps/portal/docs/features/Users/Standard/Products/Completed/UserProfileRedesignPrd.md` for the simpler follow-up user profile detail requirement.
* Keep authorization behavior aligned between server actions and API routes when future UI changes are implemented.

MVP decision:

* This module is sufficient for MVP admin user management.
* Do not block MVP on a richer profile UI.
