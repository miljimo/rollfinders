# PRD: TableRow Component

Source: `src/components/Table/TableRow.tsx`

## Purpose

Render a single table row from dynamic columns.

## Requirements

IF a row and columns are provided  
WHEN the row renders  
THEN it SHALL render one `TableCell` per column.

IF a column has custom render behavior  
WHEN the cell renders  
THEN the row SHALL pass the row data to that renderer.

IF row hover styling exists  
WHEN the user hovers  
THEN styling SHALL not change layout dimensions.

## Done When

* Row supports arbitrary row data.
* Cell ordering matches column ordering.
