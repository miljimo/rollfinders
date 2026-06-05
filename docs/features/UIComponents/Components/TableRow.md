# PRD: TableRow Component

## Implementation Metadata

- Source: `src/components/Table/TableRow.tsx`
- Status: Ready for development
- Related component: `TableCell`

## Purpose

Render a single table row wrapper for table body content.

## Requirements

IF children are provided  
WHEN the row renders  
THEN it SHALL render the children inside a `tr`.

IF row hover styling exists  
WHEN the user hovers  
THEN styling SHALL not change layout dimensions.

IF row content includes custom cells or action cells  
WHEN rendered  
THEN the row SHALL not impose entity-specific assumptions on those children.

## Done When

* Row supports arbitrary child cells.
* Cell ordering remains controlled by `TableBody`.
* Hover and focus styles do not interfere with row content.
