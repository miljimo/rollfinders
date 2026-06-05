# PRD: EventCard Component

Source: `src/components/ui.tsx`

## Purpose

Render a reusable public open mat/event summary card.

## Requirements

IF event and academy data are provided  
WHEN `EventCard` renders  
THEN it SHALL show gi type, title, academy name, date, time, price, description, detail action, and directions action.

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
