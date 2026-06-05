# PRD: Admin New Open Mat Page

Route: `/admin/open-mats/new`

Source: `src/app/admin/open-mats/new/page.tsx`

## Purpose

Allow permitted admins to create open mat events.

## Requirements

IF authorized admin opens new open mat page  
WHEN academies are available  
THEN the page SHALL show open mat creation form.

IF academy admin creates an event  
WHEN form renders  
THEN academy selection SHALL be scoped to their academy.

IF many academies are available  
WHEN the user selects the academy field  
THEN the page SHALL provide searchable academy selection by name, city, or postcode instead of requiring the user to scroll a long dropdown.

IF submission succeeds  
WHEN event is created  
THEN user SHALL return to open mat management.

## Done When

* Form includes event title, academy, date, time, gi type, price, capacity, active state.
* Academy search selection submits the selected `academyId` through the existing create flow.
* Access follows existing helpers.
