# PRD: TableEmptyState Component

## Implementation Metadata

- Source: `src/components/Table/TableEmptyState.tsx`
- Status: Ready for development

## Purpose

Render a consistent empty table state.

## Requirements

IF a table has no rows  
WHEN the body renders  
THEN `TableEmptyState` SHALL display the configured empty message.

IF no empty message is supplied  
WHEN rendered  
THEN a safe default message SHALL be shown.

IF rendered by `Table` for an empty dataset  
WHEN the state appears  
THEN it SHALL display as a standalone panel above or in place of the table container.

IF a custom empty message is supplied  
WHEN rendered  
THEN the message SHALL display as text content without requiring custom markup.

## Done When

* Empty state tests pass.
* Empty state does not pretend to be a table row.
* Empty state remains readable outside horizontally scrollable table content.
