# PRD: TableCell Component

## Implementation Metadata

- Source: `src/components/Table/TableCell.tsx`
- Status: Ready for development

## Purpose

Render a single table cell wrapper with base table-cell styling.

## Requirements

IF children are supplied  
WHEN the cell renders  
THEN the children SHALL render inside a `td`.

IF cell content is long  
WHEN rendered  
THEN it SHALL not break table layout unexpectedly.

IF `className` is supplied  
WHEN the cell renders  
THEN it SHALL be composed with base cell classes.

## Done When

* Custom renderer output passed by `TableBody` can render links, forms, badges, and actions.
* Column-level class names are applied without removing base cell layout.
