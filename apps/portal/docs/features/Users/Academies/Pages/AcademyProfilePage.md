# PRD: Academy Profile Page

Route: `/academies/[slug]`

Source: `src/app/academies/[slug]/page.tsx`

## Purpose

Show detailed public academy information and upcoming open mats.

## Requirements

IF academy exists  
WHEN the page renders  
THEN it SHALL show academy name, status/affiliation, description, details, tags, upcoming open mats, and map/directions panel.

IF academy does not exist  
WHEN route resolves  
THEN it SHALL return not found.

IF optional fields are missing  
WHEN details render  
THEN the page SHALL show safe fallback text.

IF the academy is not both claimed/managed and verified
WHEN the public profile renders
THEN it SHALL show a non-blocking notice near the practical academy details telling users prices and session details may change and that they should confirm with the academy before visiting.

## Done When

* Upcoming events render as `EventCard`.
* Directions link uses academy coordinates.
* Layout remains usable on mobile.
* Unclaimed or unverified academy profiles show a calm pre-visit confirmation notice near price and contact details.
