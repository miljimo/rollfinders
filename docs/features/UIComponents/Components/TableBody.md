# PRD: TableBody Component

## Implementation Metadata

- Source: `src/components/Table/TableBody.tsx`
- Status: Ready for development
- Related components: `TableRow`, `TableCell`, `TableActions`

## Purpose

Render dynamic table body rows for non-empty table data.

## Requirements

IF data rows exist  
WHEN the body renders  
THEN it SHALL render one `TableRow` per data item.

IF columns are provided  
WHEN rows render  
THEN each row SHALL receive the same column configuration.

IF a row ID getter is supplied by the table root  
WHEN rows render  
THEN stable keys SHALL use that row ID instead of array index.

IF actions are supplied  
WHEN each row renders  
THEN the body SHALL append an actions cell using `TableActions`.

## Done When

* Row rendering is stable and entity-agnostic.
* Column configuration is passed through without mutation.
* Empty-state orchestration remains owned by `Table`.
