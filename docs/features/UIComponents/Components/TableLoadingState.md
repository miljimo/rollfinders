# PRD: TableLoadingState Component

Source: `src/components/Table/TableLoadingState.tsx`

## Purpose

Render a consistent table loading state.

## Requirements

IF table data is loading  
WHEN the loading state renders  
THEN the component SHALL show a clear loading message or placeholder.

IF columns are known  
WHEN loading state renders  
THEN the layout SHOULD preserve table width.

IF loading finishes  
WHEN data renders  
THEN loading state SHALL be replaced by rows or empty state.

## Done When

* Loading state is visually consistent.
* Loading text does not overflow.
