# PRD: Table Root Component

## Implementation Metadata

- Source: `src/components/Table/Table.tsx`
- Status: Ready for development
- Export barrel: `src/components/Table/index.tsx`
- Related PRD: `docs/features/UIComponents/Table.md`

## Purpose

Compose the reusable table component from table subcomponents.

## Requirements

IF columns and data are provided  
WHEN the table renders  
THEN it SHALL render header, body rows, empty state, and pagination when configured.

IF `minWidthClassName` is provided  
WHEN table content overflows  
THEN the table SHALL support horizontal scrolling.

IF `getRowId` is provided  
WHEN rows render  
THEN stable row keys SHALL use the supplied row ID.

IF table subcomponents are exported  
WHEN consumers import from `src/components/Table`  
THEN existing named exports SHALL remain compatible.

## Done When

* Existing table tests continue to pass.
* Table remains entity-agnostic.
* Empty and paginated states work.
* Table package exports remain stable during subcomponent migration.
