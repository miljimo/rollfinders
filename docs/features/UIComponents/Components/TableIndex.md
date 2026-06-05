# PRD: Table Root Component

Source: `src/components/Table/index.tsx`

Related: `docs/features/UIComponents/Table.md`

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

## Done When

* Existing table tests continue to pass.
* Table remains entity-agnostic.
* Empty and paginated states work.
