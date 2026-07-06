# PRD: Academies Page

Route: `/academies`

Source: `src/app/academies/page.tsx`

## Purpose

Let users browse and search London BJJ academies.

## Requirements

IF the page renders  
WHEN academies are returned  
THEN it SHALL show heading, intro copy, search form, result count, and academy grid.

IF query params include `q`, `lat`, or `lng`  
WHEN the page renders  
THEN search and sorting SHALL reflect those params.

IF public academy results contain approved/managed and unclaimed academies  
WHEN the academy grid is ordered  
THEN the page SHALL use academy discovery trust ranking to prioritize which records qualify for top-list prominence while preserving closest-first card order when user location is available.

IF no academies match  
WHEN results render  
THEN the page SHALL show a clear empty state.

IF more than one page of academies matches  
WHEN results render  
THEN the page SHALL paginate the academy grid and preserve active `q`, `lat`, and `lng` params in pagination links.

## Done When

* Search input preserves query.
* Academy cards render in responsive grid.
* Result count matches returned data.
* Trust ranking influences top-list candidate priority without moving farther cards ahead of closer cards in location-based card grids.
* When `lat` and `lng` are available, visible academy cards are sorted by closest distance first, then deterministic fallback ordering.
* Pagination shows result range, page links, Previous, and Next without requiring long scrolling.
