# PRD: Admin Dashboard Page

Route: `/admin`

Source: `src/app/admin/page.tsx`

## Purpose

Provide role-aware operational overview and module navigation.

## Requirements

IF an authorized admin opens `/admin`  
WHEN the page renders  
THEN it SHALL show role-appropriate heading, metrics, profile card, module cards, and operational panels.

IF the current user is academy admin  
WHEN data is queried  
THEN the UI SHALL show academy-scoped copy and records.

IF the current user is platform-level admin  
WHEN page renders  
THEN platform-level module options SHALL appear according to permissions.

IF the admin sidebar brand is clicked  
WHEN the user activates the RollFinders logo or name  
THEN the UI SHALL navigate to `/`.

## Done When

* Unauthorized users are redirected.
* Metrics and panels paginate safely.
* Module cards link to correct admin routes.
* Sidebar brand link routes to `/`.
