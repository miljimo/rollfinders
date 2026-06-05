# PRD: TableHeader Component

Source: `src/components/Table/TableHeader.tsx`

## Purpose

Render dynamic table column headers.

## Requirements

IF column definitions are provided  
WHEN the header renders  
THEN headers SHALL render in the supplied order.

IF a column has a title  
WHEN the header cell renders  
THEN the title SHALL be displayed.

IF a column has custom class names  
WHEN the header renders  
THEN those classes SHALL apply without breaking default layout.

## Done When

* No column names are hardcoded.
* Header supports any entity table.
