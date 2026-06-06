# PRD: Admin Academies Page

Route: `/admin?panel=academies`

Source: `src/app/admin/page.tsx`

## Purpose

Let authorized admins search, filter, paginate, and manage academy records.

## Requirements

IF an authorized admin opens the page  
WHEN academies are returned  
THEN it SHALL show metrics, filters, table rows, pagination, and permitted actions.

IF the admin is academy scoped  
WHEN page renders  
THEN it SHALL show only the assigned academy records.

IF filters are applied  
WHEN page reloads  
THEN selected filter values SHALL persist.

## Done When

* Uses reusable `Table`.
* Page size supports 20, 50, 100.
* New Academy action appears only where permitted.
