# PRD: AcademyCard Component

## Implementation Metadata

- Source: `src/components/AcademyCard.tsx`
- Status: Ready for development
- Related shared primitive: `Badge`
- Dependency decision: `Badge` usage is required when the shared component exists; until then, existing local tag styling may remain.

## Purpose

Render a reusable public academy summary card.

This component should align with the broader Academy Listing Card PRD while preserving the existing public academy discovery behavior.

## Requirements

IF academy data is provided  
WHEN `AcademyCard` renders  
THEN it SHALL show academy name, location, description summary, tags, and details action.

IF the academy is verified  
WHEN the heading renders  
THEN a verified indicator SHALL be shown.

IF capability fields are true  
WHEN tags render  
THEN gi, no-gi, beginner friendly, competition, and drop-in price tags SHALL display appropriately.

IF the shared `Badge` component exists  
WHEN affiliation, capability, price, or event chips render  
THEN the card SHALL use `Badge` instead of local one-off tag styling.

IF upcoming events are provided  
WHEN the card renders  
THEN it SHALL show up to two event links.

## Done When

* Name and details route to `/academies/[slug]`.
* Event links route to `/open-mats/[id]`.
* Missing optional values do not create misleading UI.
* Shared badges keep public card tags consistent with admin and detail surfaces.
