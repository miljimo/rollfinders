# PRD: Admin Settings Page

Route: `/admin/settings`

Source: `src/app/admin/settings/page.tsx`

## Purpose

Provide platform/admin settings and password update access.

## Requirements

IF permitted admin opens settings  
WHEN page renders  
THEN settings content and password form SHALL be shown according to permissions.

IF unauthorized user opens settings  
WHEN authorization runs  
THEN access SHALL be rejected or redirected.

IF password change succeeds or fails  
WHEN form returns  
THEN feedback SHALL be visible.

## Done When

* Settings route remains protected.
* PasswordForm is usable.
