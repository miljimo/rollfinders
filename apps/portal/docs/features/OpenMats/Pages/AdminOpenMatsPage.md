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

IF open mats include completed sessions  
WHEN an authorized admin opens the page  
THEN the admin view SHALL support tracking completed sessions as history without showing those completed sessions on public discovery pages.

IF open mats include recurring series  
WHEN an authorized admin opens the page  
THEN the admin view SHALL show the recurring source listing/series rather than duplicate future event rows.

IF an admin edits a recurring open mat  
WHEN the save succeeds  
THEN a single change to the source listing SHALL apply to all future derived occurrences.

## Done When

* Uses reusable `Table`.
* Filters persist after submit.
* Actions respect event permissions.
* New Open Mat dialog does not require scrolling a long academy dropdown.
* Admins can identify one-off, recurring, in-session, completed, and inactive states where relevant.
* Recurring open mats are managed from one source record/rule, not duplicate future database records.
