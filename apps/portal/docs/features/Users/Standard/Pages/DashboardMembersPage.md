# PRD: Dashboard Members Page

Route: `/dashboard/members`

Source: `src/app/dashboard/members/page.tsx`

## Purpose

Show members available to the authenticated user's dashboard scope.

## Requirements

IF authenticated user opens members page  
WHEN data loads  
THEN members SHALL render according to user scope.

IF filters/search exist  
WHEN submitted  
THEN results SHALL update without exposing out-of-scope users.

IF no members are available  
WHEN page renders  
THEN clear empty state SHALL be shown.

## Done When

* Access scope is respected.
* Members view is responsive.
