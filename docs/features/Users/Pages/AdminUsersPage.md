# PRD: Admin Users Page

Route: `/admin/users`

Source: `src/app/admin/users/page.tsx`

## Purpose

Let authorized admins search, filter, create, edit, disable, delete, and email users according to role.

## Requirements

IF authorized admin opens users page  
WHEN users exist  
THEN page SHALL show metrics, create form where allowed, filters, user table, pagination, and row actions.

IF user rows are manageable  
WHEN table renders  
THEN inline edit controls and actions SHALL be shown.

IF user rows are protected or out of scope  
WHEN table renders  
THEN read-only state SHALL be shown.

IF a user create/edit form includes academy assignment  
WHEN academies are available  
THEN the academy field SHALL reuse `AutoCompleteTextField` so admins can search by academy name instead of scrolling a long dropdown.

## Done When

* Search and filters persist.
* Role-scoped visibility is correct.
* Page size supports 20, 50, 100.
* New User academy assignment uses the shared autocomplete text field control.
