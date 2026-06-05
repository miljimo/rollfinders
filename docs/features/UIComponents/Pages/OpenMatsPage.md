# PRD: Open Mats Page

Route: `/open-mats`

Source: `src/app/open-mats/page.tsx`

## Purpose

Provide the Open Mat Radar for today's, tomorrow's, weekend, and filtered training sessions.

## Requirements

IF the page renders  
WHEN search params are present  
THEN it SHALL apply query, date, gi, and location filters.

IF radar counts are available  
WHEN the page renders  
THEN it SHALL show Today, Tomorrow, and This Weekend count links.

IF no events match  
WHEN results render  
THEN it SHALL show a clear empty state.

IF more than one page of open mats matches  
WHEN results render  
THEN the page SHALL paginate event cards and preserve active `q`, `when`, `gi`, `lat`, and `lng` params in pagination links.

## Done When

* Filter form preserves selected values.
* Count links preserve location params.
* Events render as cards.
* Pagination shows result range, page links, Previous, and Next without requiring long scrolling.
