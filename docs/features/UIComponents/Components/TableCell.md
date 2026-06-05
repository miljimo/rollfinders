# PRD: TableCell Component

Source: `src/components/Table/TableCell.tsx`

## Purpose

Render a single table cell with default or custom content.

## Requirements

IF a column render function exists  
WHEN the cell renders  
THEN the custom render output SHALL be used.

IF no custom render function exists  
WHEN the cell renders  
THEN the cell SHALL display the row value for the column key.

IF cell content is long  
WHEN rendered  
THEN it SHALL not break table layout unexpectedly.

## Done When

* Custom renderers support links, forms, badges, and actions.
* Default rendering handles missing values safely.
