# PRD: TablePagination Component

## Implementation Metadata

- Source: `src/components/Table/TablePagination.tsx`
- Status: Ready for development
- Related component: `PaginationControl`

## Purpose

Render reusable table pagination controls.

## Requirements

IF pagination props are supplied  
WHEN the component renders  
THEN it SHALL show current page, total pages, previous, and next controls.

IF the current page is the first page  
WHEN pagination renders  
THEN previous SHALL be disabled or unavailable.

IF the current page is the last page  
WHEN pagination renders  
THEN next SHALL be disabled or unavailable.

IF `previousHref` or `nextHref` is supplied  
WHEN the corresponding control is enabled  
THEN navigation SHALL preserve the configured href.

IF click handlers are supplied  
WHEN controls are used  
THEN the component SHALL support handler-driven pagination without requiring href navigation.

## Done When

* Pagination links preserve configured hrefs.
* Disabled states are clear and accessible.
* Current page and total pages remain visible on mobile.
