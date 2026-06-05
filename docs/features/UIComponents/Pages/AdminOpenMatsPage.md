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

IF the New Open Mat dialog renders  
WHEN the user chooses an academy  
THEN the dialog SHALL use searchable academy selection by name, city, or postcode and preserve the existing create action behavior.

## Done When

* Uses reusable `Table`.
* Filters persist after submit.
* Actions respect event permissions.
* New Open Mat dialog does not require scrolling a long academy dropdown.
