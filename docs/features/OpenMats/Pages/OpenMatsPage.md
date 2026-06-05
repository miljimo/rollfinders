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

IF an open mat occurrence has started and has not ended  
WHEN results render  
THEN the event card SHALL indicate that the open mat is currently in session.

IF an open mat occurrence has ended  
WHEN public results are calculated  
THEN the occurrence SHALL not appear in public Open Mat Radar results.

IF an open mat is recurring  
WHEN public results are calculated  
THEN the page SHALL render derived upcoming occurrences from the recurring source listing without requiring duplicate future event records.

## Done When

* Filter form preserves selected values.
* Count links preserve location params.
* Events render as cards.
* Pagination shows result range, page links, Previous, and Next without requiring long scrolling.
* In-session events are visually labelled.
* Completed sessions are hidden from public discovery after their end time.
* Recurring sessions can appear as dated occurrences while remaining backed by one source listing/rule.
