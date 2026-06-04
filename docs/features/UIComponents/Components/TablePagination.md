# PRD: TablePagination Component

Source: `src/components/Table/TablePagination.tsx`

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

## Done When

* Pagination links preserve configured hrefs.
* Disabled states are clear and accessible.
