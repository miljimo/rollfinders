# PRD: Admin Open Mat Detail Page

Route: `/admin/open-mats/[id]`

Source: `src/app/admin/open-mats/[id]/page.tsx`

## Purpose

Edit or review a managed open mat event.

## Requirements

IF authorized user opens an open mat detail  
WHEN event exists  
THEN the page SHALL show open mat form populated with current values.

IF user lacks edit/delete access  
WHEN route resolves  
THEN access SHALL be rejected or redirected.

IF event does not exist  
WHEN route resolves  
THEN not found SHALL be returned.

IF the open mat is a recurring source listing  
WHEN the edit form renders  
THEN the form SHALL show recurrence settings and make clear that saving changes updates all future derived occurrences.

IF the edit form still has the legacy `Repeat weekly on this day` checkbox  
WHEN recurrence requirements are implemented  
THEN that checkbox SHALL be removed or replaced with the structured recurrence control.

IF an admin changes a recurring open mat  
WHEN the save succeeds  
THEN the system SHALL update the single source listing/rule rather than updating duplicate future event records.

## Done When

* Existing OpenMat form is reused.
* Academy-scoped access is respected.
* Save/delete behaviors preserve existing admin flow.
* Recurrence edit scope is explicit.
* Future recurring occurrences reflect one source listing/rule after save.
