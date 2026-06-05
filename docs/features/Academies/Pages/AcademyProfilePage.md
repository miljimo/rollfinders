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

## Done When

* Upcoming events render as `EventCard`.
* Directions link uses academy coordinates.
* Layout remains usable on mobile.
