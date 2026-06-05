# PRD: Open Mat Detail Page

Route: `/open-mats/[id]`

Source: `src/app/open-mats/[id]/page.tsx`

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

## Done When

* Directions use full address.
* Cost/date use shared formatters.
* Detail layout remains readable on mobile.
