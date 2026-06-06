# PRD: Admin Academy Detail Page

Route: `/admin/academies/[id]`

Source: `src/app/admin/academies/[id]/page.tsx`

## Purpose

Show academy operational summary and edit controls for authorized users.

## Requirements

IF authorized user opens an academy detail  
WHEN academy exists  
THEN the page SHALL show summary, statistics, administrative actions, and edit form when allowed.

IF an authorized user can edit the academy  
WHEN the edit form renders  
THEN the page SHALL reuse the guided Academy form used by the New Academy flow with existing academy values pre-filled.

IF an authorized user clicks Next or a step navigation control in the guided edit form  
WHEN the form has not reached the Review step  
THEN the page SHALL change steps in place and SHALL NOT submit the form or redirect.

IF academy does not exist  
WHEN route resolves  
THEN it SHALL return not found.

IF user can view/manage team  
WHEN page renders  
THEN team action SHALL be shown.

IF an authorized user saves changes from the standalone Edit Academy page  
WHEN the save succeeds  
THEN the user SHALL be returned to `/admin?panel=academies`.

## Done When

* Public profile link works.
* Delete action appears only where permitted.
* Academy admin read/edit restrictions are respected.
* Save behavior preserves the academy admin management flow.
* Edit Academy uses the same grouped steps, preview, and review pattern as New Academy.
* Step navigation does not trigger save or navigation away from the edit page.
