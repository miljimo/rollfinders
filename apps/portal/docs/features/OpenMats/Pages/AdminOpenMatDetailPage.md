# PRD: Admin Open Mat Detail Page

Route: `/admin/open-mats/[id]`

Source: `src/app/admin/open-mats/[id]/page.tsx`

## Purpose

Edit or review a managed open mat event.

## Requirements

IF authorized user opens an open mat detail  
WHEN event exists  
THEN the page SHALL show open mat form populated with current values.

IF an authorized user can edit the open mat  
WHEN the edit form renders  
THEN the page SHALL reuse the same `OpenMatForm` used by the New Open Mat flow with existing event values pre-filled.

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

IF an authorized user saves changes from the standalone Edit Open Mat page  
WHEN the save succeeds  
THEN the user SHALL be returned to `/admin?panel=open-mats`.

## Done When

* Existing OpenMat form is reused.
* Academy-scoped access is respected.
* Save/delete behaviors preserve existing open mat admin flow.
* Recurrence edit scope is explicit.
* Future recurring occurrences reflect one source listing/rule after save.
* Edit Open Mat uses the same reusable form component as New Open Mat.
