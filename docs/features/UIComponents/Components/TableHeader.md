# PRD: TableHeader Component

## Implementation Metadata

- Source: `src/components/Table/TableHeader.tsx`
- Status: Ready for development

## Purpose

Render dynamic table column headers.

## Requirements

IF column definitions are provided  
WHEN the header renders  
THEN headers SHALL render in the supplied order.

IF a column has a title  
WHEN the header cell renders  
THEN the title SHALL be displayed.

IF a column has `headerClassName`  
WHEN the header renders  
THEN those classes SHALL apply without breaking default layout.

IF row actions are configured  
WHEN `hasActions` is true  
THEN the header SHALL render a right-aligned Actions column.

## Done When

* No column names are hardcoded.
* Header supports any entity table.
* Header order matches the supplied column order.
