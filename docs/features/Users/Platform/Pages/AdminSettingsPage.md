# PRD: Admin Settings Page

Route: `/admin/settings`

Source: `src/app/admin/settings/page.tsx`

## Schema Impact

No schema changes are required for this page PRD.

IF this page is implemented
WHEN the deployment is prepared
THEN no database migration script SHALL be required for this PRD.

## Purpose

Provide core/admin settings, email operations, audit visibility, and password update access.

## Requirements

IF permitted Platform Admin or Super Admin opens settings
WHEN page renders
THEN the page SHALL show Quick Actions for Change Password, Edit Profile, Email Options, and Recent Audits.

AND permitted Super Admin and Platform Admin users SHALL also see Weekly Activity Summary.

AND Weekly Activity Summary SHALL NOT be visible to Academy Admin or Standard User accounts.

IF a permitted Super Admin or Platform Admin opens the Settings panel
WHEN the page renders
THEN the selected settings action SHALL be controlled by the `settingsAction` query parameter.

AND only the selected settings content SHALL render inside one blue-marked detail panel.

WHEN the administrator clicks the Change Password action
THEN `settingsAction=change-password` SHALL render the Change Password form in the settings detail panel.

AND the Change Password form SHALL update only the authenticated administrator's own password.

AND the form SHALL NOT expose role, status, academy, or other account-management fields.

WHEN the administrator clicks the Edit Profile action
THEN `settingsAction=edit-profile` SHALL render the self-service Edit Profile form in the settings detail panel.

AND the Edit Profile form SHALL update only the authenticated administrator's own display name.

AND the Edit Profile form SHALL keep email, role, status, academy assignment, disabled state, and protected-user state read-only or hidden.

WHEN the administrator clicks the Email Options action
THEN `settingsAction=email-options` SHALL render email operations in the settings detail panel.

AND email operation filters and pagination SHALL remain controlled by `emailView` and `emailPage`.

WHEN the administrator clicks the Recent Audits action
THEN `settingsAction=recent-audits` SHALL render recent audit activity in the settings detail panel.

WHEN a permitted Super Admin or Platform Admin clicks the Weekly Activity Summary action
THEN `settingsAction=weekly-activity` SHALL render only the Weekly Activity Summary in the settings detail panel.

AND Weekly Activity Summary SHALL use the same detail-panel navigation pattern as Change Password, Email Options, and Recent Audits.

AND Weekly Activity Summary SHALL be removed from the primary dashboard surface once it is available in Settings.

AND the Weekly Activity Summary content SHALL show current-week Platform Admin contribution progress, academy goal progress, points, and suggested next action where available.

IF a permitted Academy Admin opens the Settings panel
WHEN the page renders
THEN the page SHALL show Quick Actions for Change Password and Edit Profile only.

AND Academy Admin Settings SHALL use the same selected-detail-panel pattern as other dashboard Settings actions.

WHEN the Academy Admin clicks Edit Profile
THEN `settingsAction=edit-profile` SHALL render the self-service Edit Profile form in the settings detail panel.

AND the Edit Profile form SHALL update only the authenticated Academy Admin's own display name.

AND the Edit Profile form SHALL keep email, role, status, academy assignment, disabled state, and protected-user state read-only or hidden.

AND Academy Admin Settings SHALL NOT render Email Options, Recent Audits, Weekly Activity Summary, platform settings, or other elevated-admin actions.

IF unauthorized user opens settings  
WHEN authorization runs  
THEN access SHALL be rejected or redirected.

IF password change succeeds or fails  
WHEN form returns  
THEN feedback SHALL be visible.

## Done When

* Settings route remains protected.
* QuickActionPanel drives Change Password, Edit Profile, Email Options, Recent Audits, and Weekly Activity Summary using `settingsAction`.
* Only one blue-marked settings detail panel is shown at a time.
* PasswordForm is usable by permitted Super Admin and Platform Admin users from the settings detail panel.
* Edit Profile is usable by permitted Super Admin and Platform Admin users from the settings detail panel.
* Email operations filters and pagination keep working inside the Email Options detail view.
* Weekly Activity Summary is visible only to Platform Admin and Super Admin users.
* Weekly Activity Summary is no longer rendered as a standalone primary dashboard panel.
* Academy Admin Settings exposes Change Password and Edit Profile only.
* Academy Admin Edit Profile updates only the authenticated user's own display name.
