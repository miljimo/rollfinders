# PRD: Open Mat Detail Page

Route: `/open-mats/[id]`

Source: `src/app/open-mats/[id]/page.tsx`

Expanded product requirement:

* `apps/portal/docs/features/PublicSite/Pages/PublicEventDetailsPagePrd.md`

## Purpose

Show complete details for one open mat session.

## Requirements

IF event exists  
WHEN the page renders  
THEN it SHALL show gi type, title, academy, date, time, cost, capacity, location, description, directions, and academy details action.

IF event does not exist  
WHEN route resolves  
THEN it SHALL return not found.

IF academy website is missing  
WHEN academy details action renders  
THEN it SHALL link to the public academy profile.

IF the open mat occurrence has started and has not ended  
WHEN the detail page renders  
THEN it SHALL show a clear in-session state.

IF the open mat occurrence has ended  
WHEN a public user opens the detail page  
THEN the page SHALL avoid presenting it as an upcoming opportunity and SHOULD either show a completed state or return not found based on the final history visibility decision.

IF the open mat is a derived recurring occurrence  
WHEN the detail page renders  
THEN it SHALL show the selected occurrence date while using the recurring source listing as the canonical editable record.

IF the open mat belongs to an academy that is not both claimed/managed and verified
WHEN the detail page renders
THEN it SHALL show a non-blocking notice immediately below the details card telling users prices and session details may change and that they should confirm with the academy before visiting.

## Done When

* Directions use full address.
* Cost/date use shared formatters.
* Detail layout remains readable on mobile.
* In-session and completed states are clear.
* Recurring occurrence detail does not imply the occurrence is a separate admin-created listing.
* Unclaimed or unverified academy sessions show a calm pre-visit confirmation notice near cost and location details.
