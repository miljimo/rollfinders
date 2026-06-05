# PRD: Admin New Academy Page

Route: `/admin/academies/new`

Source: `src/app/admin/academies/new/page.tsx`

## Purpose

Allow permitted admins to create academy records.

## Requirements

IF a permitted admin opens the page  
WHEN the page renders  
THEN it SHALL show academy creation form.

IF an unauthorized user opens the page  
WHEN authorization runs  
THEN access SHALL be rejected or redirected.

IF form validation fails  
WHEN submitted  
THEN errors SHALL be shown without losing entered values where supported.

## Done When

* Uses existing AcademyForm.
* Successful creation returns to academy management.
