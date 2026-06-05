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

IF the form includes recurrence controls  
WHEN the page renders  
THEN the existing `Repeat weekly on this day` checkbox SHALL be replaced with a recurrence control that supports `Does not repeat`, `Weekly`, `Monthly`, and `Yearly`.

IF admin selects a recurring option  
WHEN the open mat is created  
THEN the system SHALL create one recurring source listing/rule and derive future visible occurrences from it rather than creating duplicate future event records.

IF admin selects `Does not repeat`  
WHEN the open mat is created  
THEN the system SHALL create a one-off open mat for the selected date and time only.

IF submission succeeds  
WHEN event is created  
THEN user SHALL return to open mat management.

## Done When

* Form includes event title, academy, date, time, gi type, price, capacity, active state.
* Academy search selection submits the selected `academyId` through the existing create flow.
* Recurrence control replaces the current weekly checkbox and no longer promises to create matching records for the next 12 weeks.
* Recurring open mats are saved as one source listing/rule.
* Access follows existing helpers.
