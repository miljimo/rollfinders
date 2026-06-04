# PRD: Admin Open Mats Page

Route: `/admin/open-mats`

Source: `src/app/admin/open-mats/page.tsx`

## Purpose

Let authorized admins search, filter, paginate, and manage open mat events.

## Requirements

IF authorized admin opens the page  
WHEN open mats exist  
THEN the page SHALL show filters, table rows, pagination, and permitted actions.

IF admin is academy scoped  
WHEN data loads  
THEN only scoped academy events SHALL be shown.

IF New Open Mat is permitted  
WHEN page renders  
THEN creation action SHALL be visible.

## Done When

* Uses reusable `Table`.
* Filters persist after submit.
* Actions respect event permissions.
