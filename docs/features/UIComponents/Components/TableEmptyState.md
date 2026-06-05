# PRD: TableEmptyState Component

Source: `src/components/Table/TableEmptyState.tsx`

## Purpose

Render a consistent empty table state.

## Requirements

IF a table has no rows  
WHEN the body renders  
THEN `TableEmptyState` SHALL display the configured empty message.

IF no empty message is supplied  
WHEN rendered  
THEN a safe default message SHALL be shown.

IF the table has multiple columns  
WHEN empty state renders  
THEN it SHALL span the full table width.

## Done When

* Empty state tests pass.
* Empty state does not break table layout.
