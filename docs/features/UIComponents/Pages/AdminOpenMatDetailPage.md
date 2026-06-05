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

## Done When

* Existing OpenMat form is reused.
* Academy-scoped access is respected.
* Save/delete behaviors preserve existing admin flow.
