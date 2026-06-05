# PRD: AcademyCard Component

Source: `src/components/ui.tsx`

## Purpose

Render a reusable public academy summary card.

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

IF upcoming events are provided  
WHEN the card renders  
THEN it SHALL show up to two event links.

## Done When

* Name and details route to `/academies/[slug]`.
* Event links route to `/open-mats/[id]`.
* Missing optional values do not create misleading UI.
