# PRD: Admin Settings Page

Route: `/admin/settings`

Source: `src/app/admin/settings/page.tsx`

## Schema Impact

No schema changes are required for this page PRD.

IF this page is implemented
WHEN the deployment is prepared
THEN no database migration script SHALL be required for this PRD.

## Purpose

Provide platform/admin settings, email operations, audit visibility, and password update access.

## Requirements

IF permitted admin opens settings
WHEN page renders
THEN the page SHALL show Quick Actions for Change Password, Email Options, and Recent Audits.

IF a permitted Super Admin or Platform Admin opens the Settings panel
WHEN the page renders
THEN the selected settings action SHALL be controlled by the `settingsAction` query parameter.

AND only the selected settings content SHALL render inside one blue-marked detail panel.

WHEN the administrator clicks the Change Password action
THEN `settingsAction=change-password` SHALL render the Change Password form in the settings detail panel.

AND the Change Password form SHALL update only the authenticated administrator's own password.

AND the form SHALL NOT expose role, status, academy, or other account-management fields.

WHEN the administrator clicks the Email Options action
THEN `settingsAction=email-options` SHALL render email operations in the settings detail panel.

AND email operation filters and pagination SHALL remain controlled by `emailView` and `emailPage`.

WHEN the administrator clicks the Recent Audits action
THEN `settingsAction=recent-audits` SHALL render recent audit activity in the settings detail panel.

IF unauthorized user opens settings  
WHEN authorization runs  
THEN access SHALL be rejected or redirected.

IF password change succeeds or fails  
WHEN form returns  
THEN feedback SHALL be visible.

## Done When

* Settings route remains protected.
* QuickActionPanel drives Change Password, Email Options, and Recent Audits using `settingsAction`.
* Only one blue-marked settings detail panel is shown at a time.
* PasswordForm is usable by permitted Super Admin and Platform Admin users from the settings detail panel.
* Email operations filters and pagination keep working inside the Email Options detail view.
