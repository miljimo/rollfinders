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

IF no academies match  
WHEN results render  
THEN the page SHALL show a clear empty state.

## Done When

* Search input preserves query.
* Academy cards render in responsive grid.
* Result count matches returned data.
