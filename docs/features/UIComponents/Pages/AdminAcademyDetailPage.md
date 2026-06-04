# PRD: Admin Academy Detail Page

Route: `/admin/academies/[id]`

Source: `src/app/admin/academies/[id]/page.tsx`

## Purpose

Show academy operational summary and edit controls for authorized users.

## Requirements

IF authorized user opens an academy detail  
WHEN academy exists  
THEN the page SHALL show summary, statistics, administrative actions, and edit form when allowed.

IF academy does not exist  
WHEN route resolves  
THEN it SHALL return not found.

IF user can view/manage team  
WHEN page renders  
THEN team action SHALL be shown.

## Done When

* Public profile link works.
* Delete action appears only where permitted.
* Academy admin read/edit restrictions are respected.
