# PRD: EventCard Component

## Implementation Metadata

- Source: `src/components/EventCard.tsx`
- Status: Ready for development
- Related shared primitives: `Badge`, `Button`
- Dependency decision: `Button` usage is required; `Badge` usage is required when the shared component exists.

## Purpose

Render a reusable public open mat/event summary card.

## Requirements

IF event and academy data are provided  
WHEN `EventCard` renders  
THEN it SHALL show gi type, title, academy name, date, time, price, description, detail action, and directions action.

IF the shared `Badge` component exists  
WHEN gi type, price, or lightweight category labels are rendered  
THEN the card SHALL use `Badge` instead of local text-only label styling.

IF distance is available  
WHEN the card renders  
THEN formatted distance SHALL be shown.

IF the user clicks details  
WHEN navigation occurs  
THEN the user SHALL go to `/open-mats/[id]`.

IF the user clicks directions  
WHEN navigation occurs  
THEN directions SHALL open in a new tab.

## Done When

* Date, money, distance, and directions use shared utilities.
* Description is visually constrained.
* Card works in grid layouts.
* Actions use shared button/link styling.
