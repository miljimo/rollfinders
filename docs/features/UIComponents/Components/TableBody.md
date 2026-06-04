# PRD: TableBody Component

Source: `src/components/Table/TableBody.tsx`

## Purpose

Render dynamic table rows or empty state.

## Requirements

IF data rows exist  
WHEN the body renders  
THEN it SHALL render one `TableRow` per data item.

IF data rows are empty  
WHEN the body renders  
THEN it SHALL render `TableEmptyState`.

IF columns are provided  
WHEN rows render  
THEN each row SHALL receive the same column configuration.

## Done When

* Empty state appears for no data.
* Row rendering is stable and entity-agnostic.
